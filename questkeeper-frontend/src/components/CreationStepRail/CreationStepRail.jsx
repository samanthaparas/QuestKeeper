import "./CreationStepRail.css";

// The steps of character creation, laid out as a row across the top with an
// arrow between each. Finished steps are buttons you can go back to.
function CreationStepRail({ groups, onJump }) {
  return (
    <nav
      className="creation-step-rail"
      aria-label="Character creation progress"
    >
      <ol className="creation-step-rail__list">
        {groups.map((group, index) => {
          const marker = group.status === "complete" ? "✓" : index + 1;
          const isClickable = group.clickable ?? group.status === "complete";

          return (
            <li
              key={group.label}
              className={`creation-step-rail__item creation-step-rail__item--${group.status}`}
              aria-current={group.status === "current" ? "step" : undefined}
            >
              {isClickable ? (
                <button
                  type="button"
                  className="creation-step-rail__button"
                  onClick={() => onJump(group.firstIndex)}
                >
                  <span className="creation-step-rail__marker">{marker}</span>
                  {group.label}
                </button>
              ) : (
                <span className="creation-step-rail__static">
                  <span className="creation-step-rail__marker">{marker}</span>
                  {group.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default CreationStepRail;
