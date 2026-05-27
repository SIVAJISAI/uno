import { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function CardHand({ hand, openCard, isCurrentTurn, onPlayCard, disabled, selectedCardIndex }) {
  return (
    <div className="card-hand">
      {hand.map((card, index) => {
        const isDisabled = !!disabled;
        const isSelected = selectedCardIndex === index;
        const displayKey = `${card.color}-${card.number ?? card.type}-${index}`;
        const typeLabel = card.type === '+2' ? '+2' : card.type === 'reverse' ? '↻' : card.type === 'skip' ? '⦸' : null;
        return (
          <motion.button
            key={displayKey}
            className={`uno-card small ${card.color}${isSelected ? ' selected-move' : ''}`}
            type="button"
            disabled={isDisabled}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              onPlayCard(index, card, rect);
            }}
            whileHover={isDisabled ? {} : { y: -10, scale: 1.03, rotate: -2 }}
            whileTap={isDisabled ? {} : { y: -4, scale: 0.98 }}
            layout
            transition={{ type: 'spring', stiffness: 700, damping: 30 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {typeLabel ? (
              <span className="type-label">{typeLabel}</span>
            ) : (
              <span className="number">{card.number}</span>
            )}
            <span className="color-label">{card.color}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
