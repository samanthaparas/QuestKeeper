import "./CreationStepRail.css";

function CreationStepRail({ groups, onJump }) {
  return (
    <nav
      className="creation-step-rail"
      aria-label="Character creation progress"
    >
      <ol className="creation-step-rail__list">
        {groups.map((group) => (
          <li
            key={group.label}
            className={`creation-step-rail__item creation-step-rail__item--${group.status}`}
          >
            {group.status === "complete" ? (
              <button
                type="button"
                className="creation-step-rail__button"
                onClick={() => onJump(group.firstIndex)}
              >
                <span className="creation-step-rail__marker">✓</span>
                {group.label}
              </button>
            ) : (
              <span className="creation-step-rail__static">
                <span className="creation-step-rail__marker" />
                {group.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default CreationStepRail;
