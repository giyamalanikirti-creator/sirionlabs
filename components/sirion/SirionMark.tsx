/**
 * Sirion's mark, redrawn as an SVG from Sirion product screenshots (three
 * slanted strokes forming an "A"). Used only in the Sirion-style app's top-left
 * and its app-switcher button. Deal Ledger, our add-on, keeps its own mark.
 * To use the official file instead, replace the polygons with its paths.
 */
const GREEN = '#1DB58A';
const GREEN_ON_DARK = '#3DD6A8';

export function SirionMark({ size = 28, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill={onDark ? GREEN_ON_DARK : GREEN} aria-hidden="true">
      <polygon points="5,26 9.5,26 15.5,6 13.5,2.5" />
      <polygon points="11,26 15,26 18.2,15.6 16.2,12" />
      <polygon points="13.5,2.5 15.5,6 21,26 24.5,26" />
    </svg>
  );
}
