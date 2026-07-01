/**
 * Inline SVG icons.
 *
 * Icons ship as plain strings *inside the JS bundle* (no sprite files, no
 * network) so the editor is a single self-contained module. Each is a 24×24
 * `currentColor` glyph, themable purely with CSS `color`.
 */
const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  adjust: svg(
    '<path d="M4 8h2M9 8h11M4 16h11M18 16h2"/><circle cx="7.5" cy="8" r="1.6"/><circle cx="16.5" cy="16" r="1.6"/>',
  ),
  finetune: svg(
    '<path d="M4 7h12M4 12h16M4 17h8"/><circle cx="18" cy="7" r="1.6"/><circle cx="12" cy="17" r="1.6"/>',
  ),
  filters: svg(
    '<circle cx="9" cy="9" r="5"/><circle cx="15" cy="9" r="5"/><circle cx="12" cy="15" r="5"/>',
  ),
  watermark: svg(
    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 15l5-4 4 3 3-2 6 4"/><circle cx="8.5" cy="9.5" r="1.4"/>',
  ),
  annotate: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  resize: svg(
    '<path d="M9 3H5a2 2 0 0 0-2 2v4M21 15v4a2 2 0 0 1-2 2h-4"/><path d="M8 16l8-8M16 8h-4M16 8v4"/>',
  ),
  crop: svg('<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M2 6h14a2 2 0 0 1 2 2v14"/>'),
  rotate: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
  flipX: svg('<path d="M12 3v18"/><path d="M8 7 4 12l4 5Z"/><path d="M16 7l4 5-4 5Z"/>'),
  flipY: svg('<path d="M3 12h18"/><path d="M7 8 12 4l5 4Z"/><path d="M7 16l5 4 5-4Z"/>'),
  undo: svg('<path d="M9 7 4 12l5 5"/><path d="M4 12h11a5 5 0 0 1 0 10h-1"/>'),
  redo: svg('<path d="m15 7 5 5-5 5"/><path d="M20 12H9a5 5 0 0 0 0 10h1"/>'),
  reset: svg('<path d="M3 12a9 9 0 1 1 2.6 6.3"/><path d="M3 21v-5h5"/>'),
  trash: svg(
    '<path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6"/>',
  ),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  zoomIn: svg(
    '<circle cx="10.5" cy="10.5" r="7.5"/><path d="M21 21l-5.2-5.2M10.5 7.5v6M7.5 10.5h6"/>',
  ),
  zoomOut: svg('<circle cx="10.5" cy="10.5" r="7.5"/><path d="M21 21l-5.2-5.2M7.5 10.5h6"/>'),
  // 3×3 position anchors (arrows point to the corner/edge)
  posTopLeft: svg('<path d="M17 17 7 7M7 13V7h6"/>'),
  posTop: svg('<path d="M12 19V6M7 11l5-5 5 5"/>'),
  posTopRight: svg('<path d="M7 17 17 7M11 7h6v6"/>'),
  posLeft: svg('<path d="M19 12H6M11 7l-5 5 5 5"/>'),
  posCenter: svg(
    '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>',
  ),
  posRight: svg('<path d="M5 12h13M13 7l5 5-5 5"/>'),
  posBottomLeft: svg('<path d="M17 7 7 17M7 11v6h6"/>'),
  posBottom: svg('<path d="M12 5v13M7 13l5 5 5-5"/>'),
  posBottomRight: svg('<path d="M7 7l10 10M17 11v6h-6"/>'),
  font: svg('<path d="M4 20 9.5 6h1L16 20M6 15h8M17 20l3-9h.5l3 9M18 17h4"/>'),
  focus: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  unlock: svg(
    '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
  ),
  text: svg('<path d="M5 5h14M12 5v14M9 19h6"/>'),
  brightness: svg(
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
  ),
  contrast: svg(
    '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" stroke="none"/>',
  ),
  blur: svg('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>'),
  book: svg(
    '<path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2Z"/><path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2Z"/>',
  ),
} as const;

export type IconName = keyof typeof ICONS;
