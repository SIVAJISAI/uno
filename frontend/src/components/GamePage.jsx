import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
        <div className="table-area full-table">
          <div className="table-glow" />
          <div className="table-particles" />
          <div className="table-center">
            <div className={`direction-indicator ${gameState?.direction}`}>
              <div className="arrow" />
            </div>
            <button className={`draw-deck${deckEnabled ? '' : ' disabled'}`} onClick={deckEnabled ? onDrawCard : undefined} aria-label="Draw card">
              <div className="draw-stack" aria-hidden="true">
                <span className="stack-card">DRAW</span>
                <span className="stack-card">DRAW</span>
                <span className="stack-card">DRAW</span>
              </div>
              <div className="draw-label" aria-hidden="true">
                <strong>Draw</strong>
                <small>{gameState?.deckCount ?? 0}</small>
              </div>
            </button>
            <div className="discard-card">
              <AnimatePresence>
                {openCard ? (
                  <motion.div
                    key={`${openCard.color}-${openCard.number}`}
                    initial={{ y: 20, opacity: 0, scale: 0.96 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -20, opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.32, ease: [0.2,0.9,0.3,1] }}
                    className={`uno-card ${openCard.color} played`}
                    style={{ boxShadow: `0 36px 80px rgba(0,0,0,0.45), 0 0 40px ${openCard.color === 'red' ? 'rgba(255,80,80,0.18)' : openCard.color === 'blue' ? 'rgba(60,150,255,0.14)' : openCard.color === 'green' ? 'rgba(80,220,140,0.12)' : 'rgba(240,200,80,0.12)'}` }}
                  >
                    <span className="number">{openCard.number}</span>
                    <span className="color-label">{openCard.color}</span>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-back small" />
                )}
              </AnimatePresence>
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
