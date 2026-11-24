# IdiotQuant design system

## Direction

Calm financial research. Put the evidence people need to judge a company first; keep decoration subordinate to data.

## Color

- Primary action: deep teal `#126557` in light mode and pale teal `#73D1BB` in dark mode.
- Use neutral canvas, card, and border tokens already defined in `tailwind.config.ts`.
- Keep positive and negative market movement separate from brand color. Pair color with a signed value or label.
- Do not add gradients, glow, or colored card rails without a clear informational purpose.

## Type and numbers

- Use Open Runde for Latin interface text and Pretendard for Korean and digits. Game and admin screens use Pretendard.
- Use tabular numerals for prices, ratios, dates, and aligned financial values.
- Body and controls should remain readable at 16px on mobile. Secondary labels should generally be at least 12px.
- Preserve user zoom and text enlargement; wrap long company names instead of clipping them.

## Shape and layout

- Default controls use a 4px radius and panels use 8px. Shared action buttons use an 8px radius and a shallow lower edge that compresses on press.
- Give shared navigation a teal-tinted surface and use a grouped, elevated service menu. Desktop navigation items use plain text and neutral hover and active fills.
- Avoid nested card surfaces and decorative shadows.
- Use shared page-width presets and align headers, filters, tables, and chart labels to the same content edge.
- Mobile watchlist rows prioritize company and current price, then valuation estimate and signed difference.
- Valuation comparisons use one shared price scale with aligned current-price and model-price marks.
- Touch targets are at least 44px; inputs are at least 16px.

## Interaction and states

- Keep the primary action visible near the page heading and provide one shared stock-search entry point.
- Show loading, empty, error, and missing-data states with clear next steps.
- Keep focus visible and support keyboard navigation. Respect reduced-motion preferences.

## Exceptions

Games have their own visual system. Do not apply financial dashboard spacing or colors to game canvases.
