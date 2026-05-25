'use strict';

/**
 * Machine-readable encoding of DESIGN_SPEC.md rules.
 * Used by both the Auditor (detection) and Enhancer (fixing).
 */

const BRAND_TOKENS = {
  '--brand':       '#FF4D3D',
  '--brand-deep':  '#E63B2C',
  '--brand-soft':  '#FFE8E4',
  '--brand-tint':  '#FFF1EE',
  '--ink':         '#14131A',
  '--ink-2':       '#2A2933',
  '--muted':       '#6B6A75',
  '--muted-2':     '#9A99A4',
  '--bg':          '#FFF8F3',
  '--bg-2':        '#FFFCF8',
  '--surface':     '#FFFFFF',
  '--surface-2':   '#F6F2EC',
  '--green':       '#1E9E5E',
  '--green-soft':  '#E2F5EC',
  '--amber':       '#F2A500',
  '--amber-soft':  '#FFF4DC',
  '--red':         '#E03A30',
  '--blue':        '#2E6EF7',
  '--sun':         '#FFC627',
};

// ─── CRITICAL RULES ──────────────────────────────────────────────────────────
// Any CRITICAL failure blocks deployment

const CRITICAL_RULES = [
  {
    id: 'NO_EMOJI_UI',
    severity: 'CRITICAL',
    description: 'No emoji characters in UI text (buttons, nav, KPI labels, table cells, headings)',
    detect: 'source',
    // Matches common food/business emoji used in "AI slop" dashboards
    patterns: [
      /[\u{1F300}-\u{1F9FF}]/u,   // Misc symbols & pictographs
      /[\u{2600}-\u{26FF}]/u,      // Misc symbols
      /[\u{2700}-\u{27BF}]/u,      // Dingbats
      /[\u{1F000}-\u{1F02F}]/u,    // Mahjong tiles (covers some emoji)
      /[\u{1F0A0}-\u{1F0FF}]/u,    // Playing cards
      /[\u{1F100}-\u{1F1FF}]/u,    // Enclosed alphanumeric supplement
      /[\u{1F200}-\u{1F2FF}]/u,    // Enclosed ideographic supplement
    ],
    // Allow emoji only inside: order tracking animated confetti, reaction buttons
    allowedContexts: ['trk-cheer__emoji', 'trk-orbit__food', 'trk-tag .fire'],
    filePatterns: ['components/**/*.tsx', 'app/**/*.tsx', 'app/**/*.jsx'],
    fix: 'Replace emoji with appropriate Lucide icon inside a wrapper span with className="ico"',
  },

  {
    id: 'NO_BLUE_PURPLE_PRIMARY',
    severity: 'CRITICAL',
    description: 'No blue/indigo/purple used as primary brand color',
    detect: 'source',
    patterns: [
      /#6366f1/gi, /#4f46e5/gi, /#7c3aed/gi, /#8b5cf6/gi,
      /#3b82f6/gi, /#2563eb/gi, /#1d4ed8/gi,
      /indigo-[456789]00/g,
      /purple-[456789]00/g,
      /violet-[456789]00/g,
      /blue-[6789]00/g,
      /bg-indigo/g, /bg-purple/g, /bg-violet/g,
      /text-indigo/g, /text-purple/g, /text-violet/g,
    ],
    // The --blue token (#2E6EF7) is allowed for 'new order' status badges only
    allowedContexts: ['status-pill.new', '.new { background: #E8EFFF'],
    filePatterns: ['components/**/*.{tsx,css}', 'app/**/*.{tsx,css}'],
    fix: 'Replace with --brand (#FF4D3D) for primary actions, --ink (#14131A) for dark, or semantic tokens',
  },
];

// ─── HIGH RULES ──────────────────────────────────────────────────────────────

const HIGH_RULES = [
  {
    id: 'NO_TRANSITION_ALL',
    severity: 'HIGH',
    description: 'transition-all banned — only animate transform and opacity',
    detect: 'source',
    patterns: [
      /transition-all/g,
      /transition:\s*all/gi,
      /transition:\s*0\.\d+s\s+(?!transform|opacity)/gi,
    ],
    filePatterns: ['components/**/*.{tsx,css}', 'app/**/*.{tsx,css}'],
    fix: 'Replace with transition: transform Xms ease, opacity Xms ease',
  },

  {
    id: 'LAYERED_SHADOWS_ONLY',
    severity: 'HIGH',
    description: 'Box shadows must use CSS token variables, not hardcoded values',
    detect: 'source',
    patterns: [
      /box-shadow:\s*0\s+[24]px\s+[46]px\s+rgba\(0,\s*0,\s*0/gi,
      /shadow-md\b/g,
      /shadow-lg\b/g,
      /shadow-xl\b/g,
      /shadow-sm\b/g,
    ],
    // --sh-1 through --sh-coral are the only allowed shadow values
    allowedPatterns: [/var\(--sh-[123]?\)/g, /var\(--sh-coral\)/g, /var\(--sh-brand\)/g],
    filePatterns: ['components/**/*.{tsx,css}', 'app/**/*.{tsx,css}'],
    fix: 'Replace with var(--sh-1), var(--sh-2), var(--sh-3), or var(--sh-coral)',
  },

  {
    id: 'CORRECT_ACTIVE_NAV_PATTERN',
    severity: 'HIGH',
    description: 'Active nav items must use background fill, not left-border accent',
    detect: 'source',
    patterns: [
      /border-left.*var\(--brand\)/gi,
      /borderLeft.*brand/gi,
      /active.*border-l-4/gi,
      /active.*border-l-2/gi,
    ],
    filePatterns: ['components/layout/**/*.{tsx,css}', 'app/**/layout.tsx'],
    fix: 'Use background: var(--ink); color: #fff; with ::after dot for active nav state',
  },

  {
    id: 'NO_COLORED_CARD_HEADERS',
    severity: 'HIGH',
    description: 'Dashboard cards must not have colored header bands — all-white surface',
    detect: 'source',
    patterns: [
      /rounded-t-xl.*bg-(?!surface|white|transparent)/g,
      /card.*header.*bg-(?!surface|white|transparent)/g,
    ],
    filePatterns: ['components/admin/**/*.tsx'],
    fix: 'Use .card__h class with plain background, move color to icon badges only',
  },

  {
    id: 'NO_ZEBRA_STRIPING',
    severity: 'HIGH',
    description: 'No alternating row background colors in tables — use hairline borders',
    detect: 'source',
    patterns: [
      /even:bg-/g,
      /odd:bg-/g,
      /stripe/gi,
      /alternating.*row/gi,
    ],
    filePatterns: ['components/admin/**/*.tsx', 'components/billing/**/*.tsx'],
    fix: 'Use border-top: 1px solid var(--hairline) on rows instead of background alternation',
  },
];

// ─── MEDIUM RULES ─────────────────────────────────────────────────────────────

const MEDIUM_RULES = [
  {
    id: 'CORRECT_CTA_RADIUS',
    severity: 'MEDIUM',
    description: 'Primary CTA buttons must be pill-shaped (--r-pill: 999px)',
    detect: 'source',
    patterns: [
      /btn.*rounded-(?!full)/g,
      /button.*rounded-(?!full)/g,
    ],
    fix: 'Add border-radius: var(--r-pill) to all primary CTA buttons',
  },

  {
    id: 'VEG_DOT_NOT_EMOJI',
    severity: 'MEDIUM',
    description: 'Vegetarian indicator must use FSSAI veg-dot (CSS square+circle), not leaf emoji',
    detect: 'source',
    patterns: [/🥬|🌿|🍃/g, /leaf.*emoji/gi],
    filePatterns: ['components/customer/**/*.tsx'],
    fix: 'Use .veg-dot and .veg-dot.nonveg CSS classes for food type indicators',
  },

  {
    id: 'CORRECT_FONT_FAMILY',
    severity: 'MEDIUM',
    description: 'Must use Plus Jakarta Sans + Instrument Serif, not Inter/Roboto/system-ui',
    detect: 'source',
    patterns: [
      /font-family.*Inter/gi,
      /font-family.*Roboto/gi,
      /font-family.*system-ui(?!.*Jakarta)/gi,
    ],
    fix: 'Ensure fonts are loaded in app/layout.tsx and --sans/--display CSS variables are used',
  },

  {
    id: 'HARDCODED_COLOR_VALUES',
    severity: 'MEDIUM',
    description: 'Avoid hardcoding hex colors where a CSS token exists',
    detect: 'source',
    patterns: [
      /#FF4D3D/g, /#14131A/g, /#FFF8F3/g, /#1E9E5E/g,
      /#F2A500/g, /#E03A30/g,
    ],
    fix: 'Replace with corresponding CSS variable (e.g., var(--brand), var(--ink), var(--bg))',
  },

  {
    id: 'TABBAR_FLOATING',
    severity: 'MEDIUM',
    description: 'Mobile tab bar must float with margin, not be flush with screen edge',
    detect: 'source',
    patterns: [/tabbar.*mb-0/g, /tabbar.*bottom-0/g],
    fix: 'Ensure .tabbar has margin: 0 14px 14px and is not pinned flush to screen bottom',
  },
];

// ─── SCREEN-SPECIFIC CONTRACTS ───────────────────────────────────────────────

const SCREEN_CONTRACTS = {
  'customer-menu': {
    required: [
      { selector: '.mob', property: 'background', value: '#FFF8F3' },
      { selector: '.cust-greet h1', property: 'font-family', contains: 'Instrument Serif' },
      { selector: '.tabbar', property: 'background', value: '#14131A' },
      { selector: '.tabbar__item.is-active', property: 'background', value: '#FF4D3D' },
    ],
    forbidden: ['emoji in any text', 'blue primary color', 'inline spinner'],
  },

  'admin-dashboard': {
    required: [
      { selector: '.adm-side', property: 'background', value: '#FFFFFF' },
      { selector: '.adm-nav.is-active', property: 'background', value: '#14131A' },
      { selector: '.kpi.feature', property: 'background', value: '#14131A' },
    ],
    forbidden: ['emoji in KPI labels', 'colored card header bands', 'zebra table rows'],
  },

  'kds-main': {
    required: [
      { selector: '.kds__qty', property: 'background', value: '#14131A' },
      { selector: '.kds__timer', property: 'font-family', contains: 'JetBrains Mono' },
    ],
    forbidden: ['emoji in item names', 'emoji in notes', 'emoji in button labels'],
  },

  'customer-tracking': {
    required: [
      { selector: '.mob.tracking', property: 'background', value: '#FFFBEC' },
      { selector: '.trk-hero', property: 'background', contains: '#FFC627' },
    ],
    forbidden: [],
  },
};

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

module.exports = {
  BRAND_TOKENS,
  CRITICAL_RULES,
  HIGH_RULES,
  MEDIUM_RULES,
  SCREEN_CONTRACTS,
  ALL_RULES: [...CRITICAL_RULES, ...HIGH_RULES, ...MEDIUM_RULES],
};
