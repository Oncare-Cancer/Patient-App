/**
 * Oncare Plus — "Midnight Navy" design system.
 *
 * Every value here comes from section 03 of Oncare_Plus_App_Redesign.pdf.
 * Do not invent new colours or sizes in screens: add them here first so one
 * change moves every screen.
 *
 * The legacy COLORS / SPACING / FONT_SIZES exports at the bottom are kept so the
 * not-yet-migrated screens still compile. New code should use the named groups
 * (PALETTE, TYPE, RADIUS, SHADOW, ...) instead.
 */

/* ------------------------------------------------------------------ palette */

export const PALETTE = {
  /** Headers, primary buttons, nav bar, body text. */
  midnight: '#20206B',
  /** Header gradient end, links. */
  deepBlue: '#262F82',
  /** Selected states, progress. */
  purple: '#9966FF',
  /** Glow, highlights, "new" badges. Accent only — never for long text. */
  pink: '#CC66FF',
  /** Info cards. */
  paleBlue: '#DFEDF6',
  /** Screen background. */
  offWhite: '#F8F7FC',
  /** SOS only. Never reuse for ordinary errors. */
  sosRed: '#E11D48',

  white: '#FFFFFF',
  black: '#000000',
} as const;

/** Request / appointment status colours (section 03 "Rules"). */
export const STATUS = {
  /** done */
  done: '#16A34A',
  /** in progress */
  inProgress: PALETTE.purple,
  /** action needed */
  actionNeeded: '#D97706',
  /** cancelled */
  cancelled: '#DC2626',
} as const;

/** Text colours, in descending emphasis. */
export const TEXT = {
  primary: PALETTE.midnight,
  secondary: '#5A5A7A',
  muted: '#8A8AA3',
  onDark: PALETTE.white,
  /** Reduced-emphasis text on the navy header. */
  onDarkMuted: 'rgba(255,255,255,0.72)',
  link: PALETTE.deepBlue,
} as const;

export const SURFACE = {
  screen: PALETTE.offWhite,
  card: PALETTE.white,
  /** Info / helper cards. */
  info: PALETTE.paleBlue,
  /** Tinted fill behind service icons and selected chips. */
  tint: '#F2EDFF',
  border: '#E6E4F0',
  divider: '#EFEDF7',
  /** Disabled slot / chip background. */
  disabled: '#F1F0F6',
} as const;

/** Header gradient: navy, with a pink glow painted at the top-right. */
export const GRADIENT = {
  header: [PALETTE.midnight, PALETTE.deepBlue] as const,
  /** Selected chip / slot / date. */
  selected: [PALETTE.purple, PALETTE.pink] as const,
  /** Radial-ish glow overlay; rendered as a soft circle at top-right. */
  glow: ['rgba(204,102,255,0.55)', 'rgba(204,102,255,0)'] as const,
} as const;

/* --------------------------------------------------------------- typography */

/**
 * Font family names as registered with expo-font in app/_layout.tsx.
 * Always go through these — a bare `fontWeight` does nothing once a custom
 * family is set on Android.
 *
 * The files in assets/fonts are Montserrat (SIL OFL 1.1), subsetted to the
 * ~350 codepoints this app actually renders — Latin, punctuation, arrows and
 * the rupee sign. That takes each weight from 323 KB to 42 KB, so all three
 * weigh 127 KB instead of 972 KB. Cyrillic and Vietnamese are dropped.
 *
 * Only three weights exist on purpose: the PDF's type table asks for Regular,
 * Medium and SemiBold and nothing else. Adding Bold would cost another 42 KB
 * for a weight no screen specifies.
 *
 * Note: Montserrat has no Devanagari glyphs, so the Hindi option on D3 falls
 * back to the system font. See the comment on `DEVANAGARI_PENDING` below.
 */
export const FONTS = {
  regular: 'Montserrat-Regular',
  medium: 'Montserrat-Medium',
  semibold: 'Montserrat-SemiBold',
} as const;

/**
 * Hindi face. Montserrat ships zero Devanagari codepoints — verified, not
 * assumed — so the language toggle needs a second family rather than a second
 * weight. Noto Sans Devanagari (SIL OFL 1.1) instanced from the variable font
 * at 400/500/600 and subsetted to the Devanagari block plus joiners: 150 KB a
 * weight, down from 642 KB.
 *
 * Devanagari is inherently heavier than Latin here because the conjuncts and
 * matra positioning rules carry a lot of GSUB/GPOS data that cannot be dropped
 * without breaking how the script renders.
 *
 * `Txt` selects between the two families; screens never reference these.
 */
export const FONTS_DEVANAGARI = {
  regular: 'NotoSansDevanagari-Regular',
  medium: 'NotoSansDevanagari-Medium',
  semibold: 'NotoSansDevanagari-SemiBold',
} as const;

/**
 * The four roles from the PDF type table. Sizes are given as ranges there;
 * the mid value is the default and `lg` / `sm` cover the ends of the range.
 */
export const TYPE = {
  /** Screen title — SemiBold 17-21. */
  title: { fontFamily: FONTS.semibold, fontSize: 19, lineHeight: 25 },
  titleLg: { fontFamily: FONTS.semibold, fontSize: 21, lineHeight: 28 },
  titleSm: { fontFamily: FONTS.semibold, fontSize: 17, lineHeight: 23 },

  /** Section heading — SemiBold 15. */
  section: { fontFamily: FONTS.semibold, fontSize: 15, lineHeight: 20 },

  /** Body — Regular / Medium 12.5-13.5. */
  body: { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 19 },
  bodyMedium: { fontFamily: FONTS.medium, fontSize: 13, lineHeight: 19 },
  bodyLg: { fontFamily: FONTS.regular, fontSize: 13.5, lineHeight: 20 },
  bodySm: { fontFamily: FONTS.regular, fontSize: 12.5, lineHeight: 18 },

  /** Helper / labels — Medium 11-12. */
  helper: { fontFamily: FONTS.medium, fontSize: 11.5, lineHeight: 16 },
  helperSm: { fontFamily: FONTS.medium, fontSize: 11, lineHeight: 15 },

  /** Button label. */
  button: { fontFamily: FONTS.semibold, fontSize: 14.5, lineHeight: 20 },
} as const;

/* ------------------------------------------------------------------ metrics */

export const SPACE = {
  xxs: 4,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  /** Gutter used on every screen edge. */
  gutter: 16,
} as const;

export const RADIUS = {
  /** Cards — 16-20 in the PDF. */
  card: 18,
  cardSm: 16,
  cardLg: 20,
  /** Header bottom corners. */
  header: 32,
  /** Pills, buttons, chips. */
  pill: 999,
  input: 12,
  chip: 10,
} as const;

/**
 * Minimum touch target (PDF: >= 44 px). Use for every pressable, and remember
 * `hitSlop` when the visual box has to be smaller.
 */
export const TOUCH_MIN = 44;

/**
 * Soft card shadow. Uses `boxShadow` on web because RN 0.81 deprecates the
 * `shadow*` props there (issue #2 in the PDF's list), and elevation on Android.
 */
export const SHADOW = {
  card: {
    shadowColor: 'rgba(32,32,107,0.10)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
  nav: {
    shadowColor: 'rgba(32,32,107,0.28)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 12,
  },
  button: {
    shadowColor: 'rgba(32,32,107,0.22)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
} as const;

/** Floating bottom nav geometry, shared by the bar and the screens' bottom padding. */
export const NAV = {
  height: 62,
  /** Gap between the bar and the bottom safe-area inset. */
  inset: 10,
  /** The white "+" Book button overhangs the bar by this much. */
  bookOverhang: 18,
  bookSize: 46,
} as const;

/**
 * Space a scroll view must leave at the bottom so the floating nav never covers
 * the last row. Screens add their own safe-area inset on top of this.
 */
export const NAV_CLEARANCE = NAV.height + NAV.inset + SPACE.lg;

/* -------------------------------------------------------------------- brand */

/**
 * The CMS-hosted logo.
 *
 * @deprecated Use the `Logo` component, which renders the same artwork from
 * assets/images/oncare-logo.png. Bundling it keeps the login hero from
 * depending on the network — this URL stays only for the screens that have not
 * been migrated yet.
 */
export const LOGO_URL =
  'https://www.oncarecancer.com/img/featured/2025-10-30%2C10%3A52%3A46.595Z-logo%201.png';

/* ------------------------------------------------------- legacy (migrating) */

/**
 * @deprecated Use PALETTE / TEXT / SURFACE / STATUS. Kept so screens that have
 * not been rebuilt yet keep compiling.
 */
export const COLORS = {
  primary: PALETTE.midnight,
  secondary: PALETTE.deepBlue,
  accent1: PALETTE.purple,
  accent2: PALETTE.pink,
  lightBlue: PALETTE.paleBlue,
  black: PALETTE.black,
  white: PALETTE.white,
  gray: TEXT.muted,
  lightGray: SURFACE.disabled,
  error: STATUS.cancelled,
  success: STATUS.done,
  textPrimary: TEXT.primary,
  textSecondary: TEXT.secondary,
  border: SURFACE.border,
};

/** @deprecated Use SPACE. */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

/** @deprecated Use TYPE. */
export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};
