export function createRoomId() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  let result = '';
  for (let i = 0; i < 4; i += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  result += digits[Math.floor(Math.random() * digits.length)];
  return result;
}

export function createClientId() {
  return `client_${Math.random().toString(36).slice(2, 10)}`;
}
