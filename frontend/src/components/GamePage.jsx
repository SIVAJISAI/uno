import { useMemo, useState, useEffect, useRef } from 'react';
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

export default function GamePage({ username, clientId, room, gameState, onPlayCard, onDrawCard, onSelectColor, error, pendingAction }) {
  const currentPlayerId = gameState?.currentTurnId;
  const isCurrentTurn = currentPlayerId === clientId;
  const selfHand = gameState?.selfHand || [];
  const openCard = gameState?.openCard;
  const playerPositions = useMemo(() => (gameState ? getPlayerPositions(gameState.players, clientId) : []), [gameState, clientId]);

  const [drawPulse, setDrawPulse] = useState(false);
  const [playPulse, setPlayPulse] = useState(false);
  const [motionCard, setMotionCard] = useState(null);
  const [selectedPlayIndex, setSelectedPlayIndex] = useState(null);
  const drawTimer = useRef(null);
  const playTimer = useRef(null);
  const motionTimer = useRef(null);
  const prevDeckCount = useRef(gameState?.deckCount ?? 0);
  const prevHandCount = useRef(selfHand.length);
  const prevOpenCard = useRef(openCard);
  const drawDeckRef = useRef(null);
  const discardRef = useRef(null);
  const handPanelRef = useRef(null);

  const deckEnabled = isCurrentTurn && gameState?.status === 'playing' && !pendingAction;

  useEffect(() => {
    if (!gameState) return;

    const currentDeck = gameState.deckCount ?? 0;
    const currentHand = selfHand.length;
    const previousDeck = prevDeckCount.current;
    const previousHand = prevHandCount.current;

    if (currentDeck < previousDeck && currentHand > previousHand) {
      setDrawPulse(true);
      window.clearTimeout(drawTimer.current);
      drawTimer.current = window.setTimeout(() => setDrawPulse(false), 620);
    }

    if (openCard && prevOpenCard.current) {
      const changedCard = openCard.color !== prevOpenCard.current.color || openCard.number !== prevOpenCard.current.number;
      if (changedCard && currentHand < previousHand) {
        setPlayPulse(true);
        window.clearTimeout(playTimer.current);
        playTimer.current = window.setTimeout(() => setPlayPulse(false), 620);
      }
    }

    prevDeckCount.current = currentDeck;
    prevHandCount.current = currentHand;
    prevOpenCard.current = openCard;
  }, [gameState, selfHand.length, openCard]);

  useEffect(() => {
    if (!pendingAction) {
      setSelectedPlayIndex(null);
    }
  }, [pendingAction]);

  useEffect(() => {
    return () => {
      window.clearTimeout(drawTimer.current);
      window.clearTimeout(playTimer.current);
      window.clearTimeout(motionTimer.current);
    };
  }, []);

  const createMotionCard = (type, card, fromRect, toRect) => {
    const id = `${type}-${Date.now()}`;
    setMotionCard({ id, type, card, from: fromRect, to: toRect });
    window.clearTimeout(motionTimer.current);
    motionTimer.current = window.setTimeout(() => setMotionCard(null), 680);
  };

  const handlePlayWithAnimation = (cardIndex, card, cardRect) => {
    const discardRect = discardRef.current?.getBoundingClientRect();
    setSelectedPlayIndex(cardIndex);
    if (cardRect && discardRect) {
      createMotionCard('play', card, cardRect, discardRect);
    }
    onPlayCard(cardIndex, card);
  };

  const handleDrawWithAnimation = () => {
    const drawRect = drawDeckRef.current?.getBoundingClientRect();
    const handRect = handPanelRef.current?.getBoundingClientRect();
    if (drawRect && handRect) {
      createMotionCard('draw', null, drawRect, {
        left: handRect.left + handRect.width / 2 - 72,
        top: handRect.top + handRect.height / 2 - 96,
        width: 144,
        height: 204
      });
    }
    onDrawCard();
  };

  const handleColorSelection = (color) => {
    if (!onSelectColor) return;
    onSelectColor(color);
  };

  const pendingColorSelection = !!gameState?.pendingColorSelection && gameState?.currentTurnId === clientId;

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
            <AnimatePresence>
              {drawPulse && (
                <motion.div
                  className="table-flyer draw"
                  initial={{ x: '-50%', y: 0, opacity: 0, scale: 0.88 }}
                  animate={{ x: '-50%', y: 90, opacity: 1, scale: 1 }}
                  exit={{ x: '-50%', y: 180, opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.56, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
              {playPulse && (
                <motion.div
                  className="table-flyer play"
                  initial={{ x: '-50%', y: 100, opacity: 0, scale: 0.9 }}
                  animate={{ x: '-50%', y: 0, opacity: 1, scale: 1 }}
                  exit={{ x: '-50%', y: -120, opacity: 0, scale: 0.88 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
            </AnimatePresence>
            <motion.button
              ref={drawDeckRef}
              className={`draw-deck${deckEnabled ? '' : ' disabled'}`}
              onClick={deckEnabled ? handleDrawWithAnimation : undefined}
              aria-label="Draw card"
              whileHover={deckEnabled ? { y: -8, scale: 1.03 } : {} }
              whileTap={deckEnabled ? { scale: 0.98 } : {} }
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <div className="draw-stack" aria-hidden="true">
                <span className="stack-card">DRAW</span>
                <span className="stack-card">DRAW</span>
                <span className="stack-card">DRAW</span>
              </div>
              <div className="draw-label" aria-hidden="true">
                <strong>Draw</strong>
                <small>{gameState?.deckCount ?? 0}</small>
              </div>
            </motion.button>
            <div className="discard-card" ref={discardRef}>
              <AnimatePresence>
                {openCard ? (
                  <motion.div
                    key={`${openCard.color}-${openCard.number ?? openCard.type}`}
                    initial={{ y: 20, opacity: 0, scale: 0.96 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -20, opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.32, ease: [0.2,0.9,0.3,1] }}
                    className={`uno-card ${openCard.color} played`}
                    style={{ boxShadow: `0 36px 80px rgba(0,0,0,0.45), 0 0 40px ${openCard.color === 'red' ? 'rgba(255,80,80,0.18)' : openCard.color === 'blue' ? 'rgba(60,150,255,0.14)' : openCard.color === 'green' ? 'rgba(80,220,140,0.12)' : 'rgba(240,200,80,0.12)'}` }}
                  >
                    {openCard.type ? (
                      <span className="type-label">
                        {openCard.type === '+2' ? '+2' : openCard.type === 'reverse' ? '↻' : openCard.type === 'skip' ? '⦸' : openCard.type === 'WILD_DRAW_FOUR' ? '+4' : '✦'}
                      </span>
                    ) : (
                      <span className="number">{openCard.number}</span>
                    )}
                    <span className="color-label">{gameState?.activeColor || openCard.color}</span>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-back small" />
                )}
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence>
            {motionCard && (
              <motion.div
                key={motionCard.id}
                initial={{ left: motionCard.from.left, top: motionCard.from.top, width: motionCard.from.width, height: motionCard.from.height, opacity: 1, scale: 1 }}
                animate={{ left: motionCard.to.left, top: motionCard.to.top, width: motionCard.to.width, height: motionCard.to.height, opacity: 0.94, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: 'fixed', zIndex: 52, pointerEvents: 'none' }}
              >
                {motionCard.type === 'play' ? (
                  <div className={`uno-card ${motionCard.card.color}`}>
                    <span className="number">{motionCard.card.number}</span>
                    <span className="color-label">{motionCard.card.color}</span>
                  </div>
                ) : (
                  <div className="card-back small" />
                )}
              </motion.div>
            )}
          </AnimatePresence>

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

      <div className="hand-panel card" ref={handPanelRef}>
        <div className="hand-heading">
          <div>
            <h3>Your Hand</h3>
            <p>Click a valid card to play.</p>
          </div>
          <div className="hint">{!isCurrentTurn ? 'Wait for your turn' : 'Select a card or draw a card.'}</div>
        </div>
        <CardHand
          hand={selfHand}
          openCard={openCard}
          isCurrentTurn={isCurrentTurn}
          onPlayCard={handlePlayWithAnimation}
          disabled={pendingAction || !isCurrentTurn || gameState?.status !== 'playing' || pendingColorSelection}
          selectedCardIndex={selectedPlayIndex}
        />
      </div>
      {pendingColorSelection && (
        <div className="modal-overlay">
          <div className="color-select-modal card">
            <h3>Choose a color</h3>
            <div className="color-options">
              {['red', 'green', 'blue', 'yellow'].map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-choice ${color}`}
                  onClick={() => handleColorSelection(color)}
                >
                  {color.charAt(0).toUpperCase() + color.slice(1)}
                </button>
              ))}
            </div>
            <p className="modal-note">You must choose a color before the game continues.</p>
          </div>
        </div>
      )}
      {gameState?.status === 'finished' && <WinnerOverlay winnerName={gameState.winnerName} />}
      {error && <div className="toast error bottom-toast">{error}</div>}
    </div>
  );
}
