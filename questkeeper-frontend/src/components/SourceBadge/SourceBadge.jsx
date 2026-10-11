import "./SourceBadge.css";

// Small label showing which book an option comes from ("Tome of Heroes",
// "SRD 5.1"), so mixed lists stay easy to tell apart.
function SourceBadge({ source }) {
  if (!source) return null;

  // SRD entries get a quieter style; other books stand out a little more.
  const isSrd = source.startsWith("SRD");

  return (
    <span className={`source-badge${isSrd ? " source-badge--srd" : ""}`}>
      {source}
    </span>
  );
}

export default SourceBadge;
