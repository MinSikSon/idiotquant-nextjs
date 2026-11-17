# IdiotQuant design system

## Direction

Calm financial research. Put the evidence people need to judge a company first; keep decoration subordinate to data.

## Color

- Primary action: deep teal `#126557` in light mode and pale teal `#73D1BB` in dark mode.
- Use neutral canvas, card, and border tokens already defined in `tailwind.config.ts`.
- Keep positive and negative market movement separate from brand color. Pair color with a signed value or label.
- Do not add gradients, glow, or colored card rails without a clear informational purpose.

## Type and numbers

- Use Pretendard for Korean and Latin interface text.
- Use tabular numerals for prices, ratios, dates, and aligned financial values.
- Body and controls should remain readable at 16px on mobile. Secondary labels should generally be at least 12px.
- Preserve user zoom and text enlargement; wrap long company names instead of clipping them.

## Shape and layout

- Controls: 4px radius. Panels: 8px radius. Avoid nested card surfaces and decorative shadows.
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
