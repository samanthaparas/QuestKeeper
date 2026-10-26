import "./StatusNote.css";

// A one-line "Loading..." for small spots (a details panel, a step of a wizard)
// where the full StatusNote card would be too big. Read out politely, never
// takes focus, and its seal dot pulses only when motion is allowed.
function InlineLoading({ children, className = "" }) {
  return (
    <p className={`inline-loading ${className}`.trim()} role="status">
      {children}
    </p>
  );
}

export default InlineLoading;
