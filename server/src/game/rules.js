import { peekTopCard } from './deck.js';

export function isPlayable(card, openCard) {
  if (!card || !openCard) return false;
  // match by type (action card), color, or number
  if (card.type && openCard.type && card.type === openCard.type) return true;
  if (card.color && openCard.color && card.color === openCard.color) return true;
  if (typeof card.number !== 'undefined' && typeof openCard.number !== 'undefined' && card.number === openCard.number) return true;
  return false;
}

export function findPlayableCards(hand, openCard) {
  return hand.map((card, index) => ({ card, index })).filter(({ card }) => isPlayable(card, openCard));
}

export function getNextTurnIndex(currentIndex, players) {
  if (!players || players.length === 0) return 0;
  return (currentIndex + 1) % players.length;
}

export function getTopDiscard(discardPile) {
  return peekTopCard(discardPile);
}
