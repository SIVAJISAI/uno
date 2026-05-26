export default function WinnerOverlay({ winnerName }) {
  return (
    <div className="winner-overlay">
      <div className="winner-card">
        <h1>Winner!</h1>
        <p>{winnerName} has emptied their hand.</p>
        <div className="confetti-grid">
          {Array.from({ length: 18 }).map((_, index) => (
            <span key={index} className="confetti-piece" />
          ))}
        </div>
        <p className="victory-message">Congratulations to the champion.</p>
      </div>
    </div>
  );
}
