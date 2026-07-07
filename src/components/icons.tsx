/** Playful hand-drawn-style icons for nav + species categories. */

type IconProps = { className?: string };

export function MapIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" />
      <circle cx="12" cy="11" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CollectionIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="12" height="16" rx="2.5" transform="rotate(-6 10 11)" />
      <rect x="9" y="5" width="12" height="16" rx="2.5" transform="rotate(6 15 13)" />
    </svg>
  );
}

export function PawIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <ellipse cx="8.2" cy="7.4" rx="1.9" ry="2.5" transform="rotate(-15 8.2 7.4)" />
      <ellipse cx="15.8" cy="7.4" rx="1.9" ry="2.5" transform="rotate(15 15.8 7.4)" />
      <ellipse cx="4.6" cy="11.6" rx="1.7" ry="2.1" transform="rotate(-35 4.6 11.6)" />
      <ellipse cx="19.4" cy="11.6" rx="1.7" ry="2.1" transform="rotate(35 19.4 11.6)" />
      <path d="M12 10.5c2.9 0 5.4 2.3 5.4 5 0 2.1-1.6 3.3-5.4 3.3s-5.4-1.2-5.4-3.3c0-2.7 2.5-5 5.4-5Z" />
    </svg>
  );
}

export function TrophyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4h8v6a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5a3 3 0 0 0 3 5M16 5h3a3 3 0 0 1-3 5" />
      <path d="M12 14v3m-3.5 3h7M10 20l.5-3h3l.5 3" />
    </svg>
  );
}

export function ProfileIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c1.3-3.3 4-5 7.5-5s6.2 1.7 7.5 5" />
    </svg>
  );
}

/** Species emoji badges — cheap, colorful, no icon-font needed. */
export const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐶",
  cat: "🐱",
  rabbit: "🐰",
  bird: "🐦",
  other: "🐾",
};
