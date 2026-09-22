import {
  getRaceIcon,
  getClassIcon,
  getBackgroundIcon,
} from "../../utils/icons";
import "./ResultCard.css";

const ICON_RESOLVERS = {
  Race: getRaceIcon,
  Class: getClassIcon,
  Background: getBackgroundIcon,
};

function ResultCard({ result, onClick, isSelected }) {
  const resolveIcon = ICON_RESOLVERS[result.category];
  const iconSrc = resolveIcon ? resolveIcon(result.index) : null;

  return (
    <button
      className={`result-card ${isSelected ? "result-card--selected" : ""}`}
      type="button"
      onClick={onClick}
    >
      {iconSrc && (
        <img
          className="result-card__icon"
          src={iconSrc}
          alt=""
          aria-hidden="true"
        />
      )}
      <div className="result-card__text">
        <h3 className="result-card__name">{result.name}</h3>
        <p className="result-card__type">
          {result.category}
          {result.edition && ` · ${result.edition} SRD`}
        </p>
      </div>
    </button>
  );
}

export default ResultCard;
