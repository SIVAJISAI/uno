import { peekTopCard } from './deck.js';

export function isPlayable(card, openCard) {
  if (!card || !openCard) return false;
  return card.color === openCard.color || card.number === openCard.number;
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
