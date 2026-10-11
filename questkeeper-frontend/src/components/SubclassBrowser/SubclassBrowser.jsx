import { useEffect, useId, useState } from "react";
import { getSubclassDetails } from "../../utils/api";
import { mapSubclassToPanel } from "../../utils/srdDetails";
import { OFFICIAL_BOOKS_GROUP } from "../../utils/bookBackgrounds";
import BookEntryPanel from "../BookEntryPanel/BookEntryPanel";
import "./SubclassBrowser.css";

// A class's subclasses, read right inside its details: one tab per source
// ("SRD 5.1", "Official books", "Tome of Heroes"...), that source's subclasses
// as buttons, and the selected one's details underneath. Switching is instant
// after the first load, so players can compare many subclasses quickly.
//
// groups: [{ source, items: [{ index, name }] }] from mapClassToPanel.
// inPicker: inside character creation, book entries don't link away to My
// Homebrew (that would lose the player's progress).
function SubclassBrowser({ groups, inPicker = false }) {
  const baseId = useId();
  const [activeSource, setActiveSource] = useState(groups[0]?.source);
  const [selectedBySource, setSelectedBySource] = useState({}); // source -> index
  const [loaded, setLoaded] = useState({}); // index -> panel, or { error: true }

  const group = groups.find((g) => g.source === activeSource) ?? groups[0];
  const selectedIndex = selectedBySource[group?.source] ?? group?.items[0]?.index;
  const detail = loaded[selectedIndex];

  // Load each subclass the first time it's shown, then keep it.
  useEffect(() => {
    if (!selectedIndex || loaded[selectedIndex]) return;
    let ignore = false;
    getSubclassDetails(selectedIndex)
      .then((data) => !ignore && setLoaded((prev) => ({ ...prev, [selectedIndex]: mapSubclassToPanel(data) })))
      .catch(() => !ignore && setLoaded((prev) => ({ ...prev, [selectedIndex]: { error: true } })));
    return () => {
      ignore = true;
    };
  }, [selectedIndex, loaded]);

  if (!group) return null;

  // Left/right arrow keys move between tabs, like most tab bars.
  function handleTabKey(event, index) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = groups[(index + step + groups.length) % groups.length];
    setActiveSource(next.source);
    document.getElementById(`${baseId}-tab-${next.source}`)?.focus();
  }

  return (
    <section className="subclass-browser" aria-label="Subclasses">
      <h3 className="subclass-browser__title">Subclasses</h3>

      <div className="subclass-browser__tabs" role="tablist" aria-label="Subclasses by source">
        {groups.map((g, index) => {
          const isActive = g.source === group.source;
          return (
            <button
              key={g.source}
              id={`${baseId}-tab-${g.source}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${baseId}-panel`}
              tabIndex={isActive ? 0 : -1}
              className={`subclass-browser__tab${isActive ? " subclass-browser__tab--active" : ""}${
                g.source === OFFICIAL_BOOKS_GROUP ? " subclass-browser__tab--official" : ""
              }`}
              onClick={() => setActiveSource(g.source)}
              onKeyDown={(event) => handleTabKey(event, index)}
            >
              {g.source} ({g.items.length})
            </button>
          );
        })}
      </div>

      <div
        className="subclass-browser__panel"
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${group.source}`}
      >
        {/* This source's subclasses; the selected one is shown below. */}
        <div className="subclass-browser__choices" role="group" aria-label={`${group.source} subclasses`}>
          {group.items.map((item) => (
            <button
              key={item.index}
              type="button"
              className={`subclass-browser__choice${
                item.index === selectedIndex ? " subclass-browser__choice--active" : ""
              }`}
              aria-pressed={item.index === selectedIndex}
              onClick={() => setSelectedBySource((prev) => ({ ...prev, [group.source]: item.index }))}
            >
              {item.name}
            </button>
          ))}
        </div>

        <div className="subclass-browser__detail" aria-live="polite">
          {!detail && <p className="subclass-browser__status">Loading...</p>}
          {detail?.error && (
            <p className="subclass-browser__status">Couldn't load this subclass. Try another, or come back later.</p>
          )}
          {detail && !detail.error && <SubclassDetail panel={detail} inPicker={inPicker} />}
        </div>
      </div>
    </section>
  );
}

// One subclass: book entries get the summary-and-link box; everything else
// shows its description and features by level.
function SubclassDetail({ panel, inPicker }) {
  return (
    <div className="subclass-browser__entry">
      <h4 className="subclass-browser__name">{panel.name}</h4>
      {panel.flavor && <p className="subclass-browser__flavor">{panel.flavor}</p>}

      {panel.bookEntry ? (
        <BookEntryPanel entry={{ ...panel.bookEntry, inPicker }} />
      ) : (
        <>
          {panel.description && <p className="subclass-browser__description">{panel.description}</p>}
          {panel.features?.length > 0 && (
            <ul className="subclass-browser__features">
              {panel.features.map((feature, index) => (
                <li key={`${feature.name}-${index}`}>
                  <strong>
                    {feature.name}
                    {feature.level ? ` (level ${feature.level})` : ""}.
                  </strong>{" "}
                  {feature.description}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default SubclassBrowser;
