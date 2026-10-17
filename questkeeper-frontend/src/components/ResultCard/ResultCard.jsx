import {
  getRaceIcon,
  getClassIcon,
  getBackgroundIcon,
  getSpellSchoolIcon,
} from "../../utils/icons";
import { useId } from "react";
import SourceBadge from "../SourceBadge/SourceBadge";
import { OFFICIAL_BOOKS_GROUP } from "../../utils/bookBackgrounds";
import "./ResultCard.css";

const ICON_RESOLVERS = {
  Race: getRaceIcon,
  Class: getClassIcon,
  Background: getBackgroundIcon,
};

function ResultCard({ result, onClick, isSelected }) {
  const previewId = useId();
  const resolveIcon = ICON_RESOLVERS[result.category];
  const schoolId = typeof result.school === "string"
    ? result.school
    : result.school?.index ?? result.school?.name;
  const iconSrc = result.category === "Spell"
    ? getSpellSchoolIcon(schoolId)
    : resolveIcon ? resolveIcon(result.index) : null;

  return (
    <button
      className={`result-card ${isSelected ? "result-card--selected" : ""}`}
      type="button"
      onClick={onClick}
      aria-describedby={result.preview ? previewId : undefined}
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
          {/* The badge names the book, so the "· 2014 SRD" text is only a fallback. */}
          {result.source ? (
            <>
              {" "}
              <SourceBadge
                source={result.source}
                official={result.sourceGroup === OFFICIAL_BOOKS_GROUP}
              />
            </>
          ) : (
            result.edition && ` · ${result.edition} SRD`
          )}
        </p>
        {result.chip && <span className="result-card__chip">{result.chip}</span>}
        {result.tagline && (
          <p className="result-card__tagline">{result.tagline}</p>
        )}
      </div>

      {/* Hover or keyboard-focus preview: covers this card with its name and
          summary, so it's clear which card it belongs to. */}
      {result.preview && (
        <span className="result-card__preview" aria-hidden="true">
          {/* The card's icon comes along (small), since the preview covers it. */}
          <span className="result-card__preview-name">
            {iconSrc && <img className="result-card__preview-icon" src={iconSrc} alt="" />}
            {result.name}
          </span>
          <span>{result.preview}</span>
        </span>
      )}
      {/* The same summary for screen readers, as the card's description. */}
      {result.preview && (
        <span id={previewId} hidden>
          {result.preview}
        </span>
      )}
    </button>
  );
}

export default ResultCard;
