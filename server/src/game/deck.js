const COLORS = ['red', 'blue', 'green', 'yellow'];
const NUMBERS = Array.from({ length: 10 }, (_, index) => index);
const POWER_TYPES = ['+2', 'reverse', 'skip'];

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createDeck() {
  const deck = [];
  COLORS.forEach((color) => {
    NUMBERS.forEach((number) => {
      deck.push({ color, number });
      deck.push({ color, number });
    });
    // add power cards for each color (two copies each)
    POWER_TYPES.forEach((type) => {
      deck.push({ color, type });
      deck.push({ color, type });
    });
  });
  return shuffle(deck);
}

export function drawCards(deck, count = 1) {
  const drawn = [];
  for (let i = 0; i < count && deck.length > 0; i += 1) {
    drawn.push(deck.shift());
  }
  return drawn;
}

export function peekTopCard(discardPile) {
  return discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;
}

export function replenishDeckFromDiscard(deck, discardPile) {
  if (deck.length > 0 || discardPile.length <= 1) {
    return deck;
  }
  const topCard = discardPile.pop();
  const shuffled = shuffle([...discardPile]);
  discardPile.length = 0;
  discardPile.push(topCard);
  return shuffled;
}
