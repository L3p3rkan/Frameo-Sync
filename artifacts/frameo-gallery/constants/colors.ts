/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#f7ead6',
    tint: '#f3a45d',
    background: '#141923',
    foreground: '#f7ead6',
    card: '#202735',
    cardForeground: '#f7ead6',
    primary: '#f3a45d',
    primaryForeground: '#1b1c24',
    secondary: '#2d3443',
    secondaryForeground: '#f5dfc5',
    muted: '#252d3a',
    mutedForeground: '#a7afbd',
    accent: '#c97863',
    accentForeground: '#fff2e3',
    destructive: '#dc6d68',
    destructiveForeground: '#fff7f0',
    border: '#3a4351',
    input: '#313a49',
  },
  dark: {
    text: '#f7ead6',
    tint: '#f3a45d',
    background: '#10151e',
    foreground: '#f7ead6',
    card: '#1b2230',
    cardForeground: '#f7ead6',
    primary: '#f3a45d',
    primaryForeground: '#171a22',
    secondary: '#273141',
    secondaryForeground: '#f5dfc5',
    muted: '#212a38',
    mutedForeground: '#9ea9b8',
    accent: '#c97863',
    accentForeground: '#fff2e3',
    destructive: '#dc6d68',
    destructiveForeground: '#fff7f0',
    border: '#354050',
    input: '#2a3443',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
