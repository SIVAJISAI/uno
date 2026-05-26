import { useMemo } from 'react';
import CardHand from './CardHand';
import PlayerCircle from './PlayerCircle';
import WinnerOverlay from './WinnerOverlay';

const POSITIONS = {
  2: ['top'],
  3: ['top-left', 'top-right'],
  4: ['left', 'top', 'right'],
  5: ['left', 'top-left', 'top-right', 'right'],
  6: ['left', 'top-left', 'top', 'top-right', 'right']
};

function getPlayerPositions(players, clientId) {
  const visitorPlayers = players.filter((player) => player.clientId !== clientId);
  const classes = POSITIONS[visitorPlayers.length] || POSITIONS[6];
  return visitorPlayers.map((player, index) => ({
    ...player,
    position: classes[index] || 'top'
  }));
}

export default function GamePage({ username, clientId, room, gameState, onPlayCard, onDrawCard, error, pendingAction }) {
  const currentPlayerId = gameState?.currentTurnId;
  const isCurrentTurn = currentPlayerId === clientId;
  const selfHand = gameState?.selfHand || [];
  const openCard = gameState?.openCard;
  const playerPositions = useMemo(() => (gameState ? getPlayerPositions(gameState.players, clientId) : []), [gameState, clientId]);

  const deckEnabled = isCurrentTurn && gameState?.status === 'playing' && !pendingAction;

  return (
    <div className="view-container game-view">
      <div className="game-shell">
        <div className="game-status-panel card">
          <h2>Room {room?.roomId}</h2>
          <div className="status-row">
            <span>Current Turn</span>
            <strong>{gameState?.currentTurnName || 'Waiting'}</strong>
          </div>
          <div className="status-row">
            <span>Deck</span>
            <strong>{gameState?.deckCount ?? 0}</strong>
          </div>
          <div className="status-row">
            <span>Players</span>
            <strong>{gameState?.players?.length || 0}</strong>
          </div>
          <div className="status-row">
            <span>Status</span>
            <strong>{gameState?.status === 'playing' ? 'In progress' : gameState?.status}</strong>
          </div>
        </div>

        <div className="table-area">
          <div className="table-center">
            <div className={`direction-indicator ${gameState?.direction}`}>
              <div className="arrow" />
            </div>
            <button className={`draw-deck${deckEnabled ? '' : ' disabled'}`} onClick={deckEnabled ? onDrawCard : undefined}>
              <span>Draw</span>
              <small>{gameState?.deckCount ?? 0}</small>
            </button>
            <div className="discard-card">
              {openCard ? (
                <div className={`uno-card ${openCard.color}`}>
                  <span className="number">{openCard.number}</span>
                  <span className="color-label">{openCard.color}</span>
                </div>
              ) : (
                <div className="card-back small" />
              )}
            </div>
          </div>

          {playerPositions.map((player) => (
            <PlayerCircle key={player.clientId} player={player} isActive={player.clientId === currentPlayerId} />
          ))}

          <div className={`player-circle bottom ${clientId === currentPlayerId ? 'active' : ''}`}>
            <div className="player-card-count">{selfHand.length} cards</div>
            <div className="player-name">{username} (You)</div>
            <div className={`player-turn-indicator${clientId === currentPlayerId ? ' active' : ''}`}>
              {clientId === currentPlayerId ? 'Your Turn' : 'Waiting'}
            </div>
          </div>
        </div>
      </div>

      <div className="hand-panel card">
        <div className="hand-heading">
          <div>
            <h3>Your Hand</h3>
            <p>Click a valid card to play.</p>
          </div>
          <div className="hint">{!isCurrentTurn ? 'Wait for your turn' : 'Select a card or draw a card.'}</div>
        </div>
        <CardHand hand={selfHand} openCard={openCard} isCurrentTurn={isCurrentTurn} onPlayCard={onPlayCard} disabled={pendingAction || !isCurrentTurn || gameState?.status !== 'playing'} />
      </div>
      {gameState?.status === 'finished' && <WinnerOverlay winnerName={gameState.winnerName} />}
      {error && <div className="toast error bottom-toast">{error}</div>}
    </div>
  );
}
