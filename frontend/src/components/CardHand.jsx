import { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function CardHand({ hand, openCard, isCurrentTurn, onPlayCard, disabled }) {
  const playableIndexes = useMemo(() => {
    if (!openCard) return [];
    return hand
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => card.color === openCard.color || card.number === openCard.number)
      .map(({ index }) => index);
  }, [hand, openCard]);

  return (
    <div className="card-hand">
      {hand.map((card, index) => {
        const isPlayable = playableIndexes.includes(index);
        const isDisabled = disabled || !isPlayable;
        return (
          <motion.button
            key={`${card.color}-${card.number}-${index}`}
            className={`uno-card small ${card.color} ${isPlayable ? 'playable' : 'disabled'}`}
            type="button"
            disabled={isDisabled}
            onClick={() => onPlayCard(index)}
            whileHover={isDisabled ? {} : { y: -10, scale: 1.03, rotate: -2 }}
            whileTap={isDisabled ? {} : { y: -4, scale: 0.98 }}
            layout
            transition={{ type: 'spring', stiffness: 700, damping: 30 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <span className="number">{card.number}</span>
            <span className="color-label">{card.color}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
