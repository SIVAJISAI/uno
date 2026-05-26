export default function PlayerCircle({ player, isActive }) {
  const visible = Math.max(0, Math.min(player.cardCount, 20));
  return (
    <div className={`player-circle ${player.position} ${isActive ? 'active' : ''}`} aria-hidden={false}>
      <div className="player-meta">
        <div className="player-card-count">{player.cardCount} cards</div>
        <div className="player-name">{player.username}</div>
      </div>
      {isActive && <div className="player-turn-indicator">Turn</div>}

      <div className="opponent-cards" role="list">
        {Array.from({ length: visible }).map((_, index) => (
          <div key={index} className={`card-back small pos-${index}`} style={{ ['--i']: index }} aria-hidden="true" />
        ))}
      </div>
    </div>
  );
}
