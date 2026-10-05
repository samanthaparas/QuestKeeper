import "./CreationTips.css";

// A friendly card beside the narrower creation steps: a few plain-language
// tips, and room for a picture (see CREATION_STEP_ART in creationSteps.js).
function CreationTips({ title, tips, art }) {
  return (
    <aside className="creation-tips" aria-label="Tips for this step">
      {art && <img className="creation-tips__art" src={art} alt="" />}
      <h2 className="creation-tips__title">{title}</h2>
      <ul className="creation-tips__list">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </aside>
  );
}

export default CreationTips;
