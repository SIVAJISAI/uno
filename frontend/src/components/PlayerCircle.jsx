export default function PlayerCircle({ player, isActive }) {
  return (
    <div className={`player-circle ${player.position} ${isActive ? 'active' : ''}`}>
      <div className="player-card-count">{player.cardCount} cards</div>
      <div className="player-name">{player.username}</div>
      {isActive && <div className="player-turn-indicator">Turn</div>}
      <div className="opponent-cards">
        {Array.from({ length: Math.min(5, Math.max(1, Math.ceil(player.cardCount / 2))) }).map((_, index) => (
          <div key={index} className="card-back small" />
        ))}
      </div>
    </div>
  );
}
