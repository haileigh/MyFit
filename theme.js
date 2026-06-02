export const COLORS = {
  // Primary brand — deep navy / road blue
  primary: '#0A2540',
  primaryMid: '#185FA5',
  primaryLight: '#E6F1FB',

  // Accent — signal green (progress, success)
  accent: '#2D6A4F',
  accentLight: '#D8F3DC',

  // Warning / night driving
  amber: '#B45309',
  amberLight: '#FEF3C7',

  // Danger / alerts
  danger: '#991B1B',
  dangerLight: '#FEE2E2',

  // Neutrals
  white: '#FFFFFF',
  bg: '#F5F6FA',
  bgCard: '#FFFFFF',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  // Text
  textPrimary: '#0A2540',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textOnDark: '#FFFFFF',

  // Tab bar
  tabActive: '#185FA5',
  tabInactive: '#94A3B8',
};

export const FONTS = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const SHADOW = {
  card: {
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  subtle: {
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
};

// Journey step statuses
export const STEP_STATUS = {
  DONE: 'done',
  ACTIVE: 'active',
  NOT_STARTED: 'not_started',
};

// Default skills library
export const DEFAULT_SKILLS = [
  'Highway merging',
  'Parallel parking',
  'Reversing',
  'Left turns at busy intersections',
  'Night driving',
  'Freeway exits',
  'Roundabouts',
  'Lane changes',
  'Emergency braking',
  'Parking on hills',
  'Three-point turn',
  'Right-of-way rules',
  'Rain / wet roads',
  'Blind spots & mirrors',
  'Backing into spaces',
];

// Default top-5 priority skills
export const DEFAULT_PRIORITY_SKILLS = [
  'Highway merging',
  'Parallel parking',
  'Reversing',
  'Left turns at busy intersections',
  'Night driving',
];

// Hours required — Virginia defaults (can be overridden in Settings)
export const REQUIRED_HOURS = {
  total: 45,
  night: 15,
};
