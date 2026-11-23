// Small line icons for the Actions tab (attacks and companions): a paw, a
// summon spark, a d20, Fey Step, concentration, a clock, a shield and a
// notebook (weapons have their own pictures: WeaponIcon). Drawn in the text
// colour (currentColor), so they follow the light and dark themes. They sit
// beside words, never instead of them, so they're hidden from screen readers
// unless given a title.
//
// <CompanionIcon name="fey-step" size={20} /> Fey Step

const SHAPES = {
  "companion-paw": (
    <g>
      <ellipse cx="7" cy="7" rx="1.7" ry="2.2" />
      <ellipse cx="17" cy="7" rx="1.7" ry="2.2" />
      <ellipse cx="3.6" cy="11.5" rx="1.5" ry="2" />
      <ellipse cx="20.4" cy="11.5" rx="1.5" ry="2" />
      <path d="M7.2 16.3c1.6-1.3 2-4.3 4.8-4.3s3.2 3 4.8 4.3c3.5 2.9.4 5.2-2.3 3.9a5.5 5.5 0 0 0-5 0c-2.7 1.3-5.8-1-2.3-3.9Z" />
    </g>
  ),
  "summon-spark": (
    <g>
      <path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z" />
      <path d="M20 2v4M18 4h4" />
    </g>
  ),
  "dice-d20": (
    <g>
      <path d="m12 2 9 6v9l-9 5-9-5V8l9-6Z" />
      <path d="m12 2-5 13 14-7M3 8l14 7-5-13M3 17l4-2 5 7 5-7 4 2M7 15h10" />
    </g>
  ),
  "fey-step": (
    <g>
      <path d="M3 17c2-4 5-5 8-3s5 1 6-2" />
      <path d="m14 11 4-1-1 4" />
      <path d="m7 3 1.3 3.7L12 8l-3.7 1.3L7 13 5.7 9.3 2 8l3.7-1.3L7 3Z" />
      <path d="M16 20h5M19 4h3M20.5 2.5v3" />
    </g>
  ),
  concentration: (
    <g>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 1v3M12 20v3M1 12h3M20 12h3" />
    </g>
  ),
  "duration-clock": (
    <g>
      <circle cx="12" cy="13" r="8.5" />
      <path d="M12 8v5l3.5 2M9 2h6M12 2v2.5" />
    </g>
  ),
  "armor-shield": (
    <g>
      <path d="m12 2 8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3Z" />
      <path d="M12 6v11M8 10h8" />
    </g>
  ),
  "notes-book": (
    <g>
      <path d="M3 4h7c1.1 0 2 .9 2 2 0-1.1.9-2 2-2h7v16h-7c-1.1 0-2 .9-2 2 0-1.1-.9-2-2-2H3V4Z" />
      <path d="M12 6v16M6 8h3M6 12h3M15 8h3M15 12h3" />
    </g>
  ),
};

function CompanionIcon({ name, size = 20, title, className = "", ...props }) {
  if (!SHAPES[name]) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`companion-icon ${className}`.trim()}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      focusable="false"
      {...props}
    >
      {SHAPES[name]}
    </svg>
  );
}

export default CompanionIcon;
