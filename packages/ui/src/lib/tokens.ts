/**
 * Semantic token references for use in inline styles and chart configurations.
 *
 * Use these instead of hardcoded hex values in chart stroke/fill props.
 * Values are static CSS var() strings — SSR-safe (no getComputedStyle, no DOM access required).
 * The actual color values resolve through CSS custom properties at browser paint time,
 * so light/dark mode is handled automatically by the theme.css token contract.
 *
 * Usage:
 *   import { tokens } from '@farsight/ui/lib/tokens'
 *   // Good:  stroke={tokens.chart[0]}
 *   // Avoid: stroke="#266DF0"  (breaks dark mode, ignores design tokens)
 *
 * tokens.chart[N] references --color-chart-N (not --chart-N directly).
 * The @theme inline block in theme.css maps --color-chart-1 → var(--chart-1),
 * so --color-chart-* names are always defined when theme.css is imported.
 */
export const tokens = {
  chart: [
    'var(--color-chart-1)',
    'var(--color-chart-2)',
    'var(--color-chart-3)',
    'var(--color-chart-4)',
    'var(--color-chart-5)',
  ],
  color: {
    background:  'var(--color-background)',
    foreground:  'var(--color-foreground)',
    primary:     'var(--color-primary)',
    muted:       'var(--color-muted)',
    mutedFg:     'var(--color-muted-foreground)',
    destructive: 'var(--color-destructive)',
    border:      'var(--color-border)',
    warning:     'var(--color-chart-4)',
  },
} as const

export type TokenChart = typeof tokens.chart[number]
export type TokenColor = keyof typeof tokens.color
