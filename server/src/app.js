import { createServer } from 'http';
import { Hono } from 'hono';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile, stat } from 'fs/promises';
import { createRoomId, createClientId } from './utils/id.js';
import { ROOM_EVENTS, CLIENT_EVENTS } from './game/events.js';
import { RoomManager } from './game/roomManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = new Hono();
const roomManager = new RoomManager();

const distRoot = path.join(__dirname, '../../frontend/dist');

app.get('/api/status', (c) => c.json({ status: 'ready' }));

const getContentType = (pathname) => {
  const ext = path.extname(pathname).toLowerCase();
  const map = {
    '.html': 'text/html; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
  };
  return map[ext] || 'application/octet-stream';
};

app.get('/*', async (c) => {
  const url = new URL(c.req.url, `http://localhost`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') {
    pathname = '/index.html';
  }
  const safePath = path.normalize(path.join(distRoot, pathname));
  if (!safePath.startsWith(distRoot)) {
    console.warn('[STATIC] blocked unsafe path', pathname, safePath);
    return c.text('Not found', 404);
  }
  try {
    const stats = await stat(safePath);
    if (stats.isDirectory()) {
      console.warn('[STATIC] directory request denied', pathname);
      return c.text('Not found', 404);
    }
    console.log('[STATIC] serving', pathname);
    const file = await readFile(safePath);
    return new Response(file, {
      headers: { 'Content-Type': getContentType(safePath) }
    });
  } catch (error) {
    console.warn('[STATIC] file not found', pathname, error?.code || error.message);
    return c.text('Not found', 404);
  }
});

const server = createServer(async (req, res) => {
  const targetPort = process.env.PORT || 3000;
  const url = `http://localhost:${targetPort}${req.url || ''}`;
  console.log(`[HTTP] ${req.method} ${req.url}`);
  try {
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req,
    });

    const response = await app.fetch(request);
    console.log(`[HTTP] Response ${response.status} ${req.method} ${req.url}`);
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    if (response.body) {
      for await (const chunk of response.body) {
        res.write(chunk);
      }
    }
    res.end();
  } catch (error) {
    console.error('[HTTP] Request error', req.method, req.url, error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});
const wsServer = new WebSocketServer({ server, path: '/ws' });

const connections = new Map();

function safeSend(ws, message) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcastToRoom(roomId, message) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;
  room.players.forEach((player) => {
    const ws = connections.get(player.clientId);
    if (ws) safeSend(ws, message);
  });
}

wsServer.on('connection', (ws) => {
  const clientId = createClientId();
  console.log(`[WS] Connection opened: ${clientId}`);
  connections.set(clientId, ws);
  safeSend(ws, { type: 'CONNECTED', payload: { clientId } });

  ws.on('message', async (data) => {
    try {
      const raw = data.toString();
      const message = JSON.parse(raw);
      const { type, payload } = message;
      console.log(`[WS] ${clientId} -> ${type}`, payload);

      switch (type) {
        case CLIENT_EVENTS.LOGIN: {
          const { username } = payload || {};
          if (!username || typeof username !== 'string' || username.trim().length < 2) {
            return safeSend(ws, { type: ROOM_EVENTS.INVALID_MOVE, payload: { message: 'Username must be at least 2 characters.' } });
          }
          roomManager.registerClient(clientId, username.trim());
          return safeSend(ws, { type: 'LOGIN_SUCCESS', payload: { clientId, username: username.trim() } });
        }
        case CLIENT_EVENTS.CREATE_ROOM: {
          const client = roomManager.getClient(clientId);
          if (!client) {
            return safeSend(ws, { type: ROOM_EVENTS.INVALID_MOVE, payload: { message: 'Login required before creating a room.' } });
          }
          const roomId = createRoomId();
          const room = roomManager.createRoom(roomId, clientId);
          roomManager.addPlayerToRoom(roomId, clientId);
          safeSend(ws, { type: ROOM_EVENTS.ROOM_CREATED, payload: roomManager.sanitizeRoom(roomId, clientId) });
          broadcastToRoom(roomId, { type: ROOM_EVENTS.ROOM_UPDATED, payload: roomManager.sanitizeRoom(roomId, clientId) });
          return;
        }
        case CLIENT_EVENTS.JOIN_ROOM: {
          const { roomId } = payload || {};
          const client = roomManager.getClient(clientId);
          if (!client) {
            return safeSend(ws, { type: ROOM_EVENTS.INVALID_MOVE, payload: { message: 'Login required before joining a room.' } });
          }
          if (!roomId || typeof roomId !== 'string') {
            return safeSend(ws, { type: ROOM_EVENTS.INVALID_MOVE, payload: { message: 'Room ID is required.' } });
          }
          const result = roomManager.joinRoom(roomId.toUpperCase(), clientId);
          if (!result.success) {
            return safeSend(ws, { type: ROOM_EVENTS.INVALID_MOVE, payload: { message: result.message } });
          }
          broadcastToRoom(roomId.toUpperCase(), { type: ROOM_EVENTS.ROOM_UPDATED, payload: roomManager.sanitizeRoom(roomId.toUpperCase(), clientId) });
          return;
        }
        case CLIENT_EVENTS.START_GAME: {
          const room = roomManager.startGame(clientId);
          if (!room.success) {
            return safeSend(ws, { type: ROOM_EVENTS.INVALID_MOVE, payload: { message: room.message } });
          }
          broadcastToRoom(room.roomId, { type: ROOM_EVENTS.GAME_STARTED, payload: roomManager.sanitizeRoom(room.roomId, clientId) });
          broadcastToRoom(room.roomId, { type: ROOM_EVENTS.GAME_STATE_UPDATED, payload: roomManager.getGameState(room.roomId, clientId) });
          return;
        }
        case CLIENT_EVENTS.PLAY_CARD: {
          const { cardIndex } = payload || {};
          const result = roomManager.playCard(clientId, cardIndex);
          if (!result.success) {
            return safeSend(ws, { type: ROOM_EVENTS.INVALID_MOVE, payload: { message: result.message } });
          }
          broadcastToRoom(result.roomId, { type: ROOM_EVENTS.GAME_STATE_UPDATED, payload: roomManager.getGameState(result.roomId, clientId) });
          if (result.finished) {
            broadcastToRoom(result.roomId, { type: ROOM_EVENTS.GAME_FINISHED, payload: roomManager.getGameState(result.roomId, clientId) });
          }
          return;
        }
        case CLIENT_EVENTS.DRAW_CARD: {
          const result = roomManager.drawCard(clientId);
          if (!result.success) {
            return safeSend(ws, { type: ROOM_EVENTS.INVALID_MOVE, payload: { message: result.message } });
          }
          broadcastToRoom(result.roomId, { type: ROOM_EVENTS.GAME_STATE_UPDATED, payload: roomManager.getGameState(result.roomId, clientId) });
          return;
        }
        default:
          safeSend(ws, { type: ROOM_EVENTS.INVALID_MOVE, payload: { message: 'Unknown command.' } });
      }
    } catch (error) {
      safeSend(ws, { type: ROOM_EVENTS.INVALID_MOVE, payload: { message: 'Failed to process message.' } });
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Connection closed: ${clientId}`);
    connections.delete(clientId);
    const left = roomManager.removePlayer(clientId);
    if (left.roomId) {
      broadcastToRoom(left.roomId, { type: ROOM_EVENTS.PLAYER_LEFT, payload: roomManager.sanitizeRoom(left.roomId, clientId) });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`UNO backend running on http://localhost:${PORT}`);
});
