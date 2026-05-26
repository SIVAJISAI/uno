import { useMemo } from 'react';

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
          <button
            key={`${card.color}-${card.number}-${index}`}
            className={`uno-card small ${card.color} ${isPlayable ? 'playable' : 'disabled'}`}
            type="button"
            disabled={isDisabled}
            onClick={() => onPlayCard(index)}
          >
            <span className="number">{card.number}</span>
            <span className="color-label">{card.color}</span>
          </button>
        );
      })}
    </div>
  );
}
