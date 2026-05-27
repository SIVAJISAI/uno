import { peekTopCard } from './deck.js';

const WILD_TYPES = ['WILD_DRAW_FOUR', 'WILD_COLOR'];

export function isPlayable(card, openCard, activeColor = null) {
  if (!card || !openCard) return false;
  if (WILD_TYPES.includes(card.type)) return true;

  const effectiveColor = openCard.color === 'black' && activeColor ? activeColor.toLowerCase() : openCard.color;

  if (card.color && effectiveColor && card.color === effectiveColor) return true;
  if (card.type && openCard.type && card.type === openCard.type) return true;
  if (typeof card.number !== 'undefined' && typeof openCard.number !== 'undefined' && card.number === openCard.number) return true;
  return false;
}

export function findPlayableCards(hand, openCard, activeColor = null) {
  return hand
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => isPlayable(card, openCard, activeColor));
}

export function getNextTurnIndex(currentIndex, players) {
  if (!players || players.length === 0) return 0;
  return (currentIndex + 1) % players.length;
}

export function getTopDiscard(discardPile) {
  return peekTopCard(discardPile);
}
