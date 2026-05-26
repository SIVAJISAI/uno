import { useState } from 'react';

export default function LobbyPage({ username, clientId, room, onCreateRoom, onJoinRoom, onStartGame, error, pendingAction }) {
  const [roomId, setRoomId] = useState('');
  const isHost = room?.hostId === clientId;

  return (
    <div className="view-container lobby-view">
      <div className="lobby-panel">
        {!room && (
          <div className="card lobby-card">
            <h1>Welcome, {username}</h1>
            <p>Create a room or join an existing game.</p>
            <div className="lobby-actions">
              <button onClick={onCreateRoom}>Create Room</button>
              <div className="join-room-form">
                <input
                  type="text"
                  value={roomId}
                  onChange={(event) => setRoomId(event.target.value.toUpperCase())}
                  placeholder="ROOM ID"
                  maxLength={5}
                />
                <button onClick={() => onJoinRoom(roomId)} disabled={roomId.trim().length < 1}>
                  Join Room
                </button>
              </div>
            </div>
            {error && <div className="toast error">{error}</div>}
          </div>
        )}

        {room && (
          <div className="card lobby-card room-summary">
            <h2>Room Lobby</h2>
            <div className="room-meta">
              <div>
                <strong>Room ID</strong>
                <span>{room.roomId}</span>
              </div>
              <div>
                <strong>Host</strong>
                <span>{room.players.find((player) => player.clientId === room.hostId)?.username || 'Host'}</span>
              </div>
              <div>
                <strong>Players</strong>
                <span>{room.playerCount}/6</span>
              </div>
            </div>
            <div className="player-list">
              {room.players.map((player) => (
                <div className="player-list-item" key={player.clientId}>
                  <span>{player.username}</span>
                  <span>{player.isHost ? 'Host' : `Cards: ${player.cardCount}`}</span>
                </div>
              ))}
            </div>
            <div className="lobby-footer">
              <button
                onClick={onStartGame}
                disabled={!isHost || room.playerCount < 2 || pendingAction}
              >
                {pendingAction ? 'Starting...' : 'Start Game'}
              </button>
              <div className="hint">
                {room.playerCount < 2 ? 'Waiting for at least 2 players...' : isHost ? 'Ready to start!' : 'Waiting for host...' }
              </div>
            </div>
            {error && <div className="toast error">{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
