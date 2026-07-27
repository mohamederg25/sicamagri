/**
 * Color Palette Constants
 * ========================
 *
 * Single source of truth for all brand colors used in inline styles.
 * Mirrors the CSS custom properties in index.css exactly.
 *
 * Text Color Hierarchy (use the darkest appropriate level):
 * ---------------------------------------------------------
 *   COLORS.text        (#111111) — Primary body text, headings, main content
 *   COLORS.textLight   (#1a1a1a) — Secondary text, slightly reduced emphasis
 *   COLORS.textMuted   (#222222) — Muted text, metadata, descriptions, labels
 *   COLORS.textSubtle  (#374151) — Subtle text, placeholders, secondary metadata
 *
 * Usage in inline styles:
 *   import { COLORS } from '../constants/colors';
 *   <div style={{ color: COLORS.text }} />          // main heading
 *   <div style={{ color: COLORS.textMuted }} />     // description text
 *   <div style={{ color: COLORS.textSubtle }} />    // secondary metadata
 *
 * For CSS class-based styling, use the CSS custom properties in index.css:
 *   color: var(--text);
 *   color: var(--text-muted);
 *   color: var(--text-subtle);
 */
export const COLORS = {
  /* 🔴 Brand Reds */
  brightRed:     '#D50010',  // Logo text / highlights / attention
  primary:       '#B02020',  // Dark Red — Backgrounds, banners
  primaryDark:   '#8A1A1A',  // Darker variant / hover
  primaryLight:  '#E85050',  // Lighter variant

  /* 🟢 Brand Green */
  secondary:     '#008030',  // Leaves, AGRI text, buttons
  secondaryDark: '#006625',  // Darker variant / hover
  secondaryLight:'#00AA40',  // Lighter variant

  secondaryBg:   '#E8F5E9',  // Light green background
  secondaryBorder:'#C8E6C9', // Light green border

  /* 🟨 Brand Yellow */
  accent:        '#F0E050',  // Logo text
  accentDark:    '#D4C020',  // Darker variant

  accentBg:      '#FFF8E1',  // Light yellow background
  accentBorder:  '#FFE082',  // Light yellow border

  /* ⚪ Neutral — Text Hierarchy (darkest → brightest) */
  background:    '#F0F7F0',
  text:          '#111111',  // Primary body text, headings (--text)
  textLight:     '#1a1a1a',  // Secondary text (--text-light)
  textMuted:     '#222222',  // Muted text, descriptions, labels (--text-muted)
  textSubtle:    '#374151',  // Subtle text, placeholders (--text-subtle)
  border:        '#E5E7EB',
  borderLight:   '#F3F4F6',
  white:         '#FFFFFF',
  sidebarBg:     '#F4F4F5',
  sidebarHover:  '#E8E8EC',
  sidebarText:   '#222222',

  /* 🏷 Semantic */
  success:       '#008030',
  successBg:     '#E8F5E9',
  successBorder: '#C8E6C9',
  successText:   '#008030',

  warning:       '#D4C020',
  warningBg:     '#FFF8E1',
  warningBorder: '#FFE082',
  warningText:   '#8D6E00',

  danger:        '#B02020',
  dangerBg:      '#FFEBEE',
  dangerBorder:  '#FFCDD2',
  dangerText:    '#991B1B',

  info:          '#1565C0',
  infoBg:        '#E3F2FD',
  infoBorder:    '#90CAF9',
  infoText:      '#075985',
};
