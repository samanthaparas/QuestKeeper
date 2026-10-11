import "./SourceBadge.css";

// Small label showing which book an option comes from ("Tome of Heroes",
// "SRD 5.1"), so mixed lists stay easy to tell apart.
// `official`: a published book QuestKeeper only links to (gets its own color).
function SourceBadge({ source, official = false }) {
  if (!source) return null;

  // SRD entries get a quieter style; other books stand out a little more.
  const isSrd = source.startsWith("SRD");
  const variant = official ? " source-badge--official" : isSrd ? " source-badge--srd" : "";

  return <span className={`source-badge${variant}`}>{source}</span>;
}

export default SourceBadge;
