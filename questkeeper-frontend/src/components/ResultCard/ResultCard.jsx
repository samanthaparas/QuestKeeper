import "./ResultCard.css";

function ResultCard({ result, onClick, isSelected }) {
  return (
    <button
      className={`result-card ${isSelected ? "result-card--selected" : ""}`}
      type="button"
      onClick={onClick}
    >
      <h3 className="result-card__name">{result.name}</h3>
      <p className="result-card__type">{result.category}</p>
    </button>
  );
}

export default ResultCard;
