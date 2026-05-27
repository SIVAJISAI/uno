import { createDeck, drawCards, replenishDeckFromDiscard } from './deck.js';
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
      // Power-card state
      activeDrawPenalty: false,
      accumulatedPenalty: 0,
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
      player.hand = drawCards(room.deck, 7);
    });
    const initialCard = drawCards(room.deck, 1)[0];
    room.discardPile = [initialCard];
    room.currentTurnIndex = 0;
    // reset action state
    room.direction = 'clockwise';
    room.activeDrawPenalty = false;
    room.accumulatedPenalty = 0;
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

    // If there is an active draw penalty, only +2 can be played
    if (room.activeDrawPenalty && card.type !== '+2') {
      return { success: false, message: 'You must respond to a draw penalty with a +2 or draw cards.' };
    }

    // Play the power card
    player.hand.splice(cardIndex, 1);
    room.discardPile.push(card);
    room.lastPlayedActionCard = card.type;

    // Handle specific action types
    if (card.type === '+2') {
      room.accumulatedPenalty = (room.accumulatedPenalty || 0) + 2;
      room.activeDrawPenalty = true;
      // advance turn to next player (who must now respond to penalty)
      room.currentTurnIndex = this._getNextIndex(playerIndex, room.players.length, room.direction, 1);

      const nextPlayer = room.players[room.currentTurnIndex];
      // If the next player has any +2, they get a chance to play; otherwise auto-resolve now
      const nextHasPlus2 = nextPlayer.hand.some((c) => c && c.type === '+2');
      if (!nextHasPlus2) {
        const toDraw = room.accumulatedPenalty || 0;
        const drawn = [];
        for (let i = 0; i < toDraw; i += 1) {
          if (room.deck.length === 0) {
            const replenished = replenishDeckFromDiscard(room.deck, room.discardPile);
            room.deck = replenished;
          }
          const d = drawCards(room.deck, 1);
          if (d.length === 0) break;
          drawn.push(d[0]);
        }
        // add drawn cards to the next player's hand
        nextPlayer.hand.push(...drawn);
        // reset penalty
        room.activeDrawPenalty = false;
        room.accumulatedPenalty = 0;
        room.lastPlayedActionCard = null;
        const skippedPlayerId = nextPlayer.clientId;
        // advance to the player after the skipped one
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
        accumulatedPenalty: room.accumulatedPenalty,
        nextPlayerId: room.players[room.currentTurnIndex].clientId
      };
    }

    if (card.type === 'reverse') {
      // flip direction
      room.direction = room.direction === 'clockwise' ? 'counter-clockwise' : 'clockwise';
      // advance to next player in new direction
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
      // skip the next player's turn
      const skippedIndex = this._getNextIndex(playerIndex, room.players.length, room.direction, 1);
      const skippedClientId = room.players[skippedIndex].clientId;
      room.skippedPlayers = room.skippedPlayers || [];
      room.skippedPlayers.push(skippedClientId);
      // advance two steps from current player
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

  playCard(clientId, cardIndex) {
    const room = this.getRoomForClient(clientId);
    if (!room) {
      return { success: false, message: 'Room not found.' };
    }
    if (room.status !== ROOM_STATUS.PLAYING) {
      return { success: false, message: 'Game is not active.' };
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
    // If a draw penalty is active and the player plays a non-+2 card,
    // automatically resolve the accumulated penalty: draw cards, skip this player's turn.
    if (room.activeDrawPenalty) {
      if (!card.type || card.type !== '+2') {
        const toDraw = room.accumulatedPenalty || 0;
        const drawn = [];
        for (let i = 0; i < toDraw; i += 1) {
          if (room.deck.length === 0) {
            const replenished = replenishDeckFromDiscard(room.deck, room.discardPile);
            room.deck = replenished;
          }
          const d = drawCards(room.deck, 1);
          if (d.length === 0) break;
          drawn.push(d[0]);
        }
        room.players[playerIndex].hand.push(...drawn);
        // reset penalty state
        room.activeDrawPenalty = false;
        room.accumulatedPenalty = 0;
        room.lastPlayedActionCard = null;
        // skip this player's turn (move to next)
        room.currentTurnIndex = this._getNextIndex(playerIndex, room.players.length, room.direction, 1);
        return { success: true, roomId: room.roomId, penaltyResolved: true, drawnCount: drawn.length };
      }
      // if card is a +2, clients should call PLAY_POWER_CARD instead (handled separately)
      return { success: false, message: 'Use PLAY_POWER_CARD to play +2 during a penalty.' };
    }

    if (!isPlayable(card, openCard)) {
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
    const playerIndex = room.players.findIndex((player) => player.clientId === clientId);
    if (playerIndex !== room.currentTurnIndex) {
      return { success: false, message: 'Not your turn.' };
    }
    // If under an active draw penalty, drawing resolves the accumulated penalty
    if (room.activeDrawPenalty) {
      const toDraw = room.accumulatedPenalty || 0;
      const drawn = [];
      for (let i = 0; i < toDraw; i += 1) {
        if (room.deck.length === 0) {
          const replenished = replenishDeckFromDiscard(room.deck, room.discardPile);
          room.deck = replenished;
        }
        const d = drawCards(room.deck, 1);
        if (d.length === 0) break;
        drawn.push(d[0]);
      }
      room.players[playerIndex].hand.push(...drawn);
      // reset penalty state
      room.activeDrawPenalty = false;
      room.accumulatedPenalty = 0;
      room.lastPlayedActionCard = null;
      // skip this player's turn (move to next)
      room.currentTurnIndex = this._getNextIndex(playerIndex, room.players.length, room.direction, 1);
      return { success: true, roomId: room.roomId, penaltyResolved: true, drawnCount: drawn.length };
    }

    if (room.deck.length === 0) {
      const replenished = replenishDeckFromDiscard(room.deck, room.discardPile);
      room.deck = replenished;
    }
    const drawn = drawCards(room.deck, 1);
    if (drawn.length === 0) {
      return { success: false, message: 'No cards remain in the draw deck.' };
    }
    room.players[playerIndex].hand.push(drawn[0]);
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
      activeDrawPenalty: !!room.activeDrawPenalty,
      accumulatedPenalty: room.accumulatedPenalty || 0,
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
