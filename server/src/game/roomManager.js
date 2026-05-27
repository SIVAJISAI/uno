import { createDeck, drawCards, replenishDeckFromDiscard, isFavoredUsername, isPowerCard, isWildCard } from './deck.js';
import { isPlayable } from './rules.js';

const ROOM_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  FINISHED: 'finished'
};

export class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.clients = new Map();
  }

  registerClient(clientId, username) {
    this.clients.set(clientId, { clientId, username });
  }

  getClient(clientId) {
    return this.clients.get(clientId);
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  createRoom(roomId, hostClientId) {
    const host = this.getClient(hostClientId);
    if (!host) return null;
    const room = {
      roomId,
      hostId: hostClientId,
      players: [],
      deck: [],
      discardPile: [],
      currentTurnIndex: 0,
      direction: 'clockwise',
      activeColor: null,
      pendingDrawCount: 0,
      drawStackActive: false,
      pendingDrawType: null,
      colorSelectionRequired: false,
      colorSelectionPlayerId: null,
      pendingWildType: null,
      skippedPlayers: [],
      lastPlayedActionCard: null,
      status: ROOM_STATUS.WAITING,
      winnerId: null
    };
    this.rooms.set(roomId, room);
    return room;
  }

  addPlayerToRoom(roomId, clientId) {
    const room = this.getRoom(roomId);
    const client = this.getClient(clientId);
    if (!room || !client) return { success: false, message: 'Room or client missing.' };
    if (room.players.find((player) => player.clientId === clientId)) {
      return { success: false, message: 'Player already in room.' };
    }
    if (room.players.length >= 6) {
      return { success: false, message: 'Room is full.' };
    }
    room.players.push({
      clientId,
      username: client.username,
      hand: [],
      joinedAt: Date.now()
    });
    return { success: true, room };
  }

  joinRoom(roomId, clientId) {
    const room = this.getRoom(roomId);
    if (!room) {
      return { success: false, message: 'Room not found.' };
    }
    if (room.status !== ROOM_STATUS.WAITING) {
      return { success: false, message: 'Game already started in this room.' };
    }
    if (room.players.length >= 6) {
      return { success: false, message: 'Room is already full.' };
    }
    const added = this.addPlayerToRoom(roomId, clientId);
    if (!added.success) return added;
    return { success: true, room: this.sanitizeRoom(roomId, clientId) };
  }

  getRoomForClient(clientId) {
    for (const room of this.rooms.values()) {
      if (room.players.some((player) => player.clientId === clientId)) {
        return room;
      }
    }
    return null;
  }

  _normalizeColor(color) {
    if (!color || typeof color !== 'string') return null;
    const normalized = color.trim().toLowerCase();
    if (['red', 'blue', 'green', 'yellow'].includes(normalized)) {
      return normalized;
    }
    return null;
  }

  _hasFavoredPlayers(room) {
    return room.players.some((player) => isFavoredUsername(player.username));
  }

  _dealInitialHands(room) {
    if (!room.deck || room.deck.length === 0) return;
    const favoredPlayers = room.players.filter((player) => isFavoredUsername(player.username));

    if (favoredPlayers.length === 0) {
      room.players.forEach((player) => {
        player.hand = drawCards(room.deck, 7);
      });
      return;
    }

    const numberCards = [];
    const powerCards = [];
    while (room.deck.length > 0) {
      const card = room.deck.shift();
      if (isPowerCard(card)) powerCards.push(card);
      else numberCards.push(card);
    }

    let favIndex = 0;
    while (powerCards.length > 0 && favoredPlayers.some((player) => player.hand.length < 7)) {
      const player = favoredPlayers[favIndex % favoredPlayers.length];
      if (player.hand.length < 7) {
        player.hand.push(powerCards.shift());
      }
      favIndex += 1;
    }

    room.players.forEach((player) => {
      while (player.hand.length < 7 && numberCards.length > 0) {
        player.hand.push(numberCards.shift());
      }
    });

    room.players.forEach((player) => {
      while (player.hand.length < 7 && (numberCards.length > 0 || powerCards.length > 0)) {
        if (numberCards.length > 0) {
          player.hand.push(numberCards.shift());
        } else {
          player.hand.push(powerCards.shift());
        }
      }
    });

    room.deck = [...numberCards, ...powerCards];
  }

  _drawForPlayer(room, playerIndex, count = 1) {
    const player = room.players[playerIndex];
    const excludePower = !isFavoredUsername(player.username) && this._hasFavoredPlayers(room);
    const drawn = drawCards(room.deck, count, { excludePower });
    player.hand.push(...drawn);
    return drawn;
  }

  startGame(clientId) {
    const room = this.getRoomForClient(clientId);
    if (!room) {
      return { success: false, message: 'Room not found.' };
    }
    if (room.hostId !== clientId) {
      return { success: false, message: 'Only the host can start the game.' };
    }
    if (room.players.length < 2) {
      return { success: false, message: 'At least 2 players are required to start.' };
    }
    room.deck = createDeck();
    room.players.forEach((player) => {
      player.hand = [];
    });
    this._dealInitialHands(room);
    const initialCard = drawCards(room.deck, 1)[0];
    room.discardPile = [initialCard];
    room.currentTurnIndex = 0;
    // reset action state
    room.direction = 'clockwise';
    room.activeColor = null;
    room.pendingDrawCount = 0;
    room.drawStackActive = false;
    room.pendingDrawType = null;
    room.colorSelectionRequired = false;
    room.colorSelectionPlayerId = null;
    room.pendingWildType = null;
    room.skippedPlayers = [];
    room.lastPlayedActionCard = null;
    room.status = ROOM_STATUS.PLAYING;
    room.winnerId = null;
    return { success: true, room };
  }

  _getNextIndex(currentIndex, playersLength, direction = 'clockwise', step = 1) {
    if (!playersLength) return 0;
    const sign = direction === 'clockwise' ? 1 : -1;
    return (currentIndex + sign * step + playersLength) % playersLength;
  }

  playPowerCard(clientId, cardIndex) {
    const room = this.getRoomForClient(clientId);
    if (!room) {
      return { success: false, message: 'Room not found.' };
    }
    if (room.status !== ROOM_STATUS.PLAYING) {
      return { success: false, message: 'Game is not active.' };
    }
    if (room.colorSelectionRequired) {
      return { success: false, message: 'Color selection is required before taking the next action.' };
    }
    const playerIndex = room.players.findIndex((player) => player.clientId === clientId);
    if (playerIndex !== room.currentTurnIndex) {
      return { success: false, message: 'Not your turn.' };
    }
    const player = room.players[playerIndex];
    if (typeof cardIndex !== 'number' || cardIndex < 0 || cardIndex >= player.hand.length) {
      return { success: false, message: 'Invalid card selection.' };
    }
    const card = player.hand[cardIndex];
    if (!card || !card.type) {
      return { success: false, message: 'Selected card is not a power card.' };
    }

    if (room.drawStackActive && room.pendingDrawCount > 0) {
      if (room.pendingDrawType === '+2' && card.type !== '+2') {
        return { success: false, message: 'You must respond to a +2 stack with another +2 or draw cards.' };
      }
      if (room.pendingDrawType === '+4' && card.type !== 'WILD_DRAW_FOUR') {
        return { success: false, message: 'You must respond to a Wild +4 stack with another Wild +4 or draw cards.' };
      }
    }

    // Play the power card
    player.hand.splice(cardIndex, 1);
    room.discardPile.push(card);
    room.lastPlayedActionCard = card.type;

    if (player.hand.length === 0) {
      room.status = ROOM_STATUS.FINISHED;
      room.winnerId = clientId;
      room.colorSelectionRequired = false;
      room.colorSelectionPlayerId = null;
      room.pendingWildType = null;
      return { success: true, finished: true, roomId: room.roomId };
    }

    if (card.type === '+2') {
      room.pendingDrawType = '+2';
      room.pendingDrawCount = (room.pendingDrawCount || 0) + 2;
      room.drawStackActive = true;
      room.currentTurnIndex = this._getNextIndex(playerIndex, room.players.length, room.direction, 1);

      const nextPlayer = room.players[room.currentTurnIndex];
      const nextHasPlus2 = nextPlayer.hand.some((c) => c && c.type === '+2');
      if (!nextHasPlus2) {
        const toDraw = room.pendingDrawCount;
        const drawn = [];
        for (let i = 0; i < toDraw; i += 1) {
          if (room.deck.length === 0) {
            const replenished = replenishDeckFromDiscard(room.deck, room.discardPile);
            room.deck = replenished;
          }
          const d = this._drawForPlayer(room, room.currentTurnIndex, 1);
          if (d.length === 0) break;
          drawn.push(d[0]);
        }
        room.drawStackActive = false;
        room.pendingDrawCount = 0;
        room.pendingDrawType = null;
        room.lastPlayedActionCard = null;
        const skippedPlayerId = nextPlayer.clientId;
        room.currentTurnIndex = this._getNextIndex(playerIndex, room.players.length, room.direction, 2);
        return {
          success: true,
          roomId: room.roomId,
          action: '+2',
          accumulatedPenalty: 0,
          penaltyResolved: true,
          drawnCount: drawn.length,
          skippedPlayerId,
          nextPlayerId: room.players[room.currentTurnIndex].clientId
        };
      }

      return {
        success: true,
        roomId: room.roomId,
        action: '+2',
        accumulatedPenalty: room.pendingDrawCount,
        nextPlayerId: room.players[room.currentTurnIndex].clientId
      };
    }

    if (card.type === 'WILD_DRAW_FOUR' || card.type === 'WILD_COLOR') {
      room.colorSelectionRequired = true;
      room.colorSelectionPlayerId = clientId;
      room.pendingWildType = card.type;
      if (card.type === 'WILD_DRAW_FOUR') {
        room.pendingDrawType = '+4';
        room.pendingDrawCount = (room.pendingDrawCount || 0) + 4;
        room.drawStackActive = true;
      }
      return {
        success: true,
        roomId: room.roomId,
        action: card.type === 'WILD_DRAW_FOUR' ? 'wild_draw_four' : 'wild_color',
        pendingColorSelection: true,
        pendingDrawCount: room.pendingDrawCount,
        drawStackActive: room.drawStackActive
      };
    }

    if (card.type === 'reverse') {
      room.direction = room.direction === 'clockwise' ? 'counter-clockwise' : 'clockwise';
      room.currentTurnIndex = this._getNextIndex(playerIndex, room.players.length, room.direction, 1);
      return {
        success: true,
        roomId: room.roomId,
        action: 'reverse',
        direction: room.direction,
        nextPlayerId: room.players[room.currentTurnIndex].clientId
      };
    }

    if (card.type === 'skip') {
      const skippedIndex = this._getNextIndex(playerIndex, room.players.length, room.direction, 1);
      const skippedClientId = room.players[skippedIndex].clientId;
      room.skippedPlayers = room.skippedPlayers || [];
      room.skippedPlayers.push(skippedClientId);
      room.currentTurnIndex = this._getNextIndex(playerIndex, room.players.length, room.direction, 2);
      return {
        success: true,
        roomId: room.roomId,
        action: 'skip',
        skippedPlayerId: skippedClientId,
        nextPlayerId: room.players[room.currentTurnIndex].clientId
      };
    }

    return { success: true, roomId: room.roomId };
  }

  selectColor(clientId, color) {
    const room = this.getRoomForClient(clientId);
    if (!room) {
      return { success: false, message: 'Room not found.' };
    }
    if (!room.colorSelectionRequired) {
      return { success: false, message: 'No color selection is pending.' };
    }
    if (room.colorSelectionPlayerId !== clientId) {
      return { success: false, message: 'Only the player who played the wild card can select the color.' };
    }
    const chosenColor = this._normalizeColor(color);
    if (!chosenColor) {
      return { success: false, message: 'Invalid color selection.' };
    }

    room.activeColor = chosenColor;
    room.colorSelectionRequired = false;
    room.colorSelectionPlayerId = null;
    const wildType = room.pendingWildType;
    room.pendingWildType = null;

    if (wildType === 'WILD_DRAW_FOUR') {
      const nextIndex = this._getNextIndex(room.currentTurnIndex, room.players.length, room.direction, 1);
      const nextPlayer = room.players[nextIndex];
      const nextHasWildDrawFour = nextPlayer.hand.some((c) => c && c.type === 'WILD_DRAW_FOUR');

      if (!nextHasWildDrawFour) {
        const toDraw = room.pendingDrawCount;
        const drawn = [];
        for (let i = 0; i < toDraw; i += 1) {
          if (room.deck.length === 0) {
            const replenished = replenishDeckFromDiscard(room.deck, room.discardPile);
            room.deck = replenished;
          }
          const d = this._drawForPlayer(room, nextIndex, 1);
          if (d.length === 0) break;
          drawn.push(d[0]);
        }

        room.drawStackActive = false;
        room.pendingDrawCount = 0;
        room.pendingDrawType = null;
        room.lastPlayedActionCard = null;
        const skippedPlayerId = nextPlayer.clientId;
        const nextAfterIndex = this._getNextIndex(nextIndex, room.players.length, room.direction, 1);
        room.currentTurnIndex = nextAfterIndex;

        return {
          success: true,
          roomId: room.roomId,
          action: 'wild_draw_four',
          activeColor: chosenColor,
          nextPlayerId: room.players[nextAfterIndex].clientId,
          pendingDrawCount: 0,
          drawStackActive: false,
          penaltyResolved: true,
          drawnCount: drawn.length,
          skippedPlayerId
        };
      }

      room.currentTurnIndex = nextIndex;
      return {
        success: true,
        roomId: room.roomId,
        action: 'wild_draw_four',
        activeColor: chosenColor,
        nextPlayerId: room.players[nextIndex].clientId,
        pendingDrawCount: room.pendingDrawCount,
        drawStackActive: room.drawStackActive
      };
    }

    if (wildType === 'WILD_COLOR') {
      room.drawStackActive = false;
      room.pendingDrawCount = 0;
      room.pendingDrawType = null;
      const nextIndex = this._getNextIndex(room.currentTurnIndex, room.players.length, room.direction, 1);
      room.currentTurnIndex = nextIndex;
      return {
        success: true,
        roomId: room.roomId,
        action: 'wild_color',
        activeColor: chosenColor,
        nextPlayerId: room.players[nextIndex].clientId,
        pendingDrawCount: 0,
        drawStackActive: false
      };
    }

    return { success: false, message: 'Unexpected wild card state.' };
  }

  playCard(clientId, cardIndex) {
    const room = this.getRoomForClient(clientId);
    if (!room) {
      return { success: false, message: 'Room not found.' };
    }
    if (room.status !== ROOM_STATUS.PLAYING) {
      return { success: false, message: 'Game is not active.' };
    }
    if (room.colorSelectionRequired) {
      return { success: false, message: 'Color selection is required before taking the next action.' };
    }
    const playerIndex = room.players.findIndex((player) => player.clientId === clientId);
    if (playerIndex !== room.currentTurnIndex) {
      return { success: false, message: 'Not your turn.' };
    }
    const player = room.players[playerIndex];
    if (typeof cardIndex !== 'number' || cardIndex < 0 || cardIndex >= player.hand.length) {
      return { success: false, message: 'Invalid card selection.' };
    }
    const card = player.hand[cardIndex];
    const openCard = room.discardPile[room.discardPile.length - 1];

    if (room.drawStackActive && room.pendingDrawCount > 0) {
      return { success: false, message: 'You must respond to the draw stack with the correct penalty card or draw cards.' };
    }

    if (!isPlayable(card, openCard, room.activeColor)) {
      return { success: false, message: 'Card cannot be played.' };
    }
    player.hand.splice(cardIndex, 1);
    room.discardPile.push(card);
    if (player.hand.length === 0) {
      room.status = ROOM_STATUS.FINISHED;
      room.winnerId = clientId;
      return { success: true, finished: true, roomId: room.roomId };
    }
    room.currentTurnIndex = this._getNextIndex(room.currentTurnIndex, room.players.length, room.direction, 1);
    return { success: true, roomId: room.roomId };
  }

  drawCard(clientId) {
    const room = this.getRoomForClient(clientId);
    if (!room) {
      return { success: false, message: 'Room not found.' };
    }
    if (room.status !== ROOM_STATUS.PLAYING) {
      return { success: false, message: 'Game is not active.' };
    }
    if (room.colorSelectionRequired) {
      return { success: false, message: 'Color selection is required before taking the next action.' };
    }
    const playerIndex = room.players.findIndex((player) => player.clientId === clientId);
    if (playerIndex !== room.currentTurnIndex) {
      return { success: false, message: 'Not your turn.' };
    }

    if (room.drawStackActive && room.pendingDrawCount > 0) {
      const toDraw = room.pendingDrawCount;
      const drawn = [];
      for (let i = 0; i < toDraw; i += 1) {
        if (room.deck.length === 0) {
          const replenished = replenishDeckFromDiscard(room.deck, room.discardPile);
          room.deck = replenished;
        }
        const d = this._drawForPlayer(room, playerIndex, 1);
        if (d.length === 0) break;
        drawn.push(d[0]);
      }
      room.drawStackActive = false;
      room.pendingDrawCount = 0;
      room.pendingDrawType = null;
      room.lastPlayedActionCard = null;
      room.currentTurnIndex = this._getNextIndex(playerIndex, room.players.length, room.direction, 1);
      return {
        success: true,
        roomId: room.roomId,
        penaltyResolved: true,
        drawnCount: drawn.length,
        skippedPlayerId: clientId,
        nextPlayerId: room.players[room.currentTurnIndex].clientId
      };
    }

    if (room.deck.length === 0) {
      const replenished = replenishDeckFromDiscard(room.deck, room.discardPile);
      room.deck = replenished;
    }
    const drawn = this._drawForPlayer(room, playerIndex, 1);
    if (drawn.length === 0) {
      return { success: false, message: 'No cards remain in the draw deck.' };
    }
    room.currentTurnIndex = this._getNextIndex(room.currentTurnIndex, room.players.length, room.direction, 1);
    return { success: true, roomId: room.roomId };
  }

  removePlayer(clientId) {
    const room = this.getRoomForClient(clientId);
    if (!room) return { roomId: null };
    const index = room.players.findIndex((player) => player.clientId === clientId);
    if (index >= 0) {
      room.players.splice(index, 1);
    }
    if (room.players.length === 0) {
      this.rooms.delete(room.roomId);
      return { roomId: null };
    }
    if (room.hostId === clientId) {
      room.hostId = room.players[0].clientId;
    }
    if (room.currentTurnIndex >= room.players.length) {
      room.currentTurnIndex = 0;
    }
    return { roomId: room.roomId };
  }

  sanitizeRoom(roomId, viewerId) {
    const room = this.getRoom(roomId);
    if (!room) return null;
    return {
      roomId: room.roomId,
      hostId: room.hostId,
      players: room.players.map((player) => ({
        clientId: player.clientId,
        username: player.username,
        cardCount: player.hand.length,
        isHost: player.clientId === room.hostId
      })),
      playerCount: room.players.length,
      status: room.status,
      currentTurnId: room.players[room.currentTurnIndex]?.clientId || null,
      roomReady: room.players.length >= 2
    };
  }

  getGameState(roomId, viewerId) {
    const room = this.getRoom(roomId);
    if (!room) return null;
    const openCard = room.discardPile[room.discardPile.length - 1] || null;
    return {
      roomId: room.roomId,
      status: room.status,
      winnerId: room.winnerId,
      winnerName: room.winnerId ? this.getClient(room.winnerId)?.username : null,
      hostId: room.hostId,
      currentTurnId: room.players[room.currentTurnIndex]?.clientId || null,
      currentTurnName: room.players[room.currentTurnIndex]?.username || null,
      deckCount: room.deck.length,
      openCard,
      direction: room.direction,
      activeColor: room.activeColor ? room.activeColor.toUpperCase() : null,
      pendingDrawCount: room.pendingDrawCount || 0,
      drawStackActive: !!room.drawStackActive,
      pendingColorSelection: !!room.colorSelectionRequired,
      colorSelectionPlayerId: room.colorSelectionPlayerId || null,
      skippedPlayers: room.skippedPlayers || [],
      lastPlayedActionCard: room.lastPlayedActionCard || null,
      players: room.players.map((player) => ({
        clientId: player.clientId,
        username: player.username,
        cardCount: player.hand.length,
        isHost: player.clientId === room.hostId
      })),
      selfHand: room.players.find((player) => player.clientId === viewerId)?.hand || []
    };
  }
}
