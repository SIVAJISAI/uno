import { useEffect, useState } from 'react';
import useWebSocket from './hooks/useWebSocket';
import LoginPage from './components/LoginPage';
import LobbyPage from './components/LobbyPage';
import GamePage from './components/GamePage';
import './styles/app.css';
import './styles/game.css';
import './styles/lobby.css';
import './styles/card.css';

const PAGE = {
  LOGIN: 'login',
  LOBBY: 'lobby',
  GAME: 'game'
};

function App() {
  const [username, setUsername] = useState('');
  const [clientId, setClientId] = useState(null);
  const [page, setPage] = useState(PAGE.LOGIN);
  const [room, setRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [pendingAction, setPendingAction] = useState(false);
  const [clientError, setClientError] = useState(null);

  useEffect(() => {
    const handleGlobalError = (event) => {
      const message = event?.message || 'Unknown client error';
      console.error('[APP] Global error', event);
      setClientError(message);
    };
    const handleRejection = (event) => {
      console.error('[APP] Unhandled rejection', event.reason);
      setClientError(event.reason?.message || 'Unhandled promise rejection');
    };
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const { socketReady, sendMessage } = useWebSocket(handleServerMessage);

  useEffect(() => {
    if (page === PAGE.GAME && gameState?.status === 'finished') {
      setPendingAction(false);
    }
  }, [gameState, page]);

  function handleServerMessage(message) {
    const { type, payload } = message || {};
    switch (type) {
      case 'CONNECTED':
        setClientId(payload.clientId);
        break;
      case 'LOGIN_SUCCESS':
        setUsername(payload.username);
        setPage(PAGE.LOBBY);
        break;
      case 'ROOM_CREATED':
      case 'ROOM_UPDATED':
        setRoom(payload);
        if (payload.status === 'playing') {
          setPage(PAGE.GAME);
        }
        break;
      case 'GAME_STARTED':
        setRoom(payload);
        setPage(PAGE.GAME);
        break;
      case 'GAME_STATE_UPDATED':
        setGameState(payload);
        setRoom((currentRoom) => {
          if (!currentRoom) return currentRoom;
          return { ...currentRoom, status: payload.status };
        });
        setPendingAction(false);
        break;
      case 'GAME_FINISHED':
        setGameState(payload);
        setPendingAction(false);
        break;
      case 'INVALID_MOVE':
        setErrorMessage(payload.message || 'Invalid move.');
        setPendingAction(false);
        break;
      default:
        break;
    }
  }

  function handleLogin(usernameText) {
    setErrorMessage(null);
    if (!socketReady) {
      return setErrorMessage('Connecting to server...');
    }
    sendMessage('LOGIN', { username: usernameText.trim() });
  }

  function handleCreateRoom() {
    setErrorMessage(null);
    sendMessage('CREATE_ROOM');
  }

  function handleJoinRoom(roomId) {
    setErrorMessage(null);
    sendMessage('JOIN_ROOM', { roomId: roomId.trim().toUpperCase() });
  }

  function handleStartGame() {
    setPendingAction(true);
    sendMessage('START_GAME');
  }

  function handlePlayCard(cardIndex) {
    setPendingAction(true);
    sendMessage('PLAY_CARD', { cardIndex });
  }

  function handleDrawCard() {
    setPendingAction(true);
    sendMessage('DRAW_CARD');
  }

  return (
    <div className="app-shell">
      {page === PAGE.LOGIN && (
        <LoginPage onLogin={handleLogin} error={errorMessage} socketReady={socketReady} />
      )}
      {page === PAGE.LOBBY && (
        <LobbyPage
          username={username}
          clientId={clientId}
          room={room}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onStartGame={handleStartGame}
          error={errorMessage}
          pendingAction={pendingAction}
        />
      )}
      {page === PAGE.GAME && (
        <GamePage
          username={username}
          clientId={clientId}
          room={room}
          gameState={gameState}
          onPlayCard={handlePlayCard}
          onDrawCard={handleDrawCard}
          error={errorMessage}
          pendingAction={pendingAction}
        />
      )}
      {clientError && <div className="toast error global-error">Client Error: {clientError}</div>}
    </div>
  );
}

export default App;
