// Crawling constants
export const CRAWL_CONFIG = {
  MAX_DEPTH: 2,
  MAX_PAGES: 30,
  VIEWPORT_WIDTH: 1440,
  VIEWPORT_HEIGHT: 900,
  PAGE_TIMEOUT: 30000,
  NETWORK_IDLE_TIMEOUT: 2000,
  RETRY_ATTEMPTS: 1,
};

// URL patterns to exclude from crawling
export const EXCLUDED_PATTERNS = [
  '/wp-admin',
  '/login',
  '/account',
  '/cart',
  '/checkout',
  '/admin',
  '/signin',
  '/signup',
  '/register',
];

// Form detection patterns
export const FORM_CONFIG = {
  // Skip forms that look like login forms
  LOGIN_KEYWORDS: ['login', 'signin', 'sign in', 'log in'],
  
  // Success indicators after form submission
  SUCCESS_KEYWORDS: ['thank', 'received', 'success', 'submitted', 'confirmation'],
  
  // Error indicators
  ERROR_KEYWORDS: ['error', 'invalid', 'failed', 'required', 'missing'],
  
  // Test data
  TEST_DATA: {
    email: `qa+${Date.now()}@example.com`,
    name: 'QA Test User',
    firstName: 'QA',
    lastName: 'Test',
    message: 'Test message from automated QA system',
    phone: '555-0100',
    company: 'QA Test Company',
    text: 'Test input',
  },
};

// Issue severity levels
export const SEVERITY_LEVELS = ['Critical', 'Major', 'Minor', 'Trivial'] as const;

// Issue statuses
export const ISSUE_STATUSES = [
  'New',
  'Open (For Dev)',
  'Ready for QA',
  'Resolved',
  'Rejected',
] as const;

// Issue types
export const ISSUE_TYPES = ['Visual', 'Form'] as const;

// User roles
export const USER_ROLES = ['qa', 'qa_lead', 'dev'] as const;

// Site environments
export const SITE_ENVIRONMENTS = ['Staging', 'Production', 'Other'] as const;

// Run statuses
export const RUN_STATUSES = ['Pending', 'Running', 'Completed', 'Failed'] as const;

// Visual anomaly types
export const ANOMALY_TYPES = {
  HORIZONTAL_SCROLL: 'horizontal_scroll',
  OVERLAPPING_ELEMENTS: 'overlapping_elements',
  VIEWPORT_OVERFLOW: 'viewport_overflow',
} as const;
