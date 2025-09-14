/**
 * Security configuration for the application
 * This file contains security-related constants and configurations
 */

export const SECURITY_CONFIG = {
  // JWT Token settings
  JWT: {
    EXPIRY_HOURS: 1, // Tokens expire in 1 hour
    REFRESH_MINUTES: 45, // Refresh tokens every 45 minutes
    MAX_REFRESH_ATTEMPTS: 3, // Maximum refresh attempts before logout
  },

  // API Security
  API: {
    TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 3,
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: 100, // 100 requests per window
  },

  // Session Security
  SESSION: {
    MAX_IDLE_TIME: 30 * 60 * 1000, // 30 minutes
    CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
  },

  // Password Security
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  },

  // HTTPS Enforcement
  HTTPS: {
    ENFORCE_HTTPS: true,
    HSTS_MAX_AGE: 31536000, // 1 year
    INCLUDE_SUBDOMAINS: true,
  },

  // CORS Configuration
  CORS: {
    ALLOWED_ORIGINS: ['https://your-domain.com'],
    ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'X-Requested-With'],
    MAX_AGE: 86400, // 24 hours
  },

  // Rate Limiting
  RATE_LIMITING: {
    ENABLED: true,
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100, // per window
    SKIP_SUCCESSFUL_REQUESTS: false,
    SKIP_FAILED_REQUESTS: false,
  },

  // Input Validation
  VALIDATION: {
    MAX_STRING_LENGTH: 1000,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    SANITIZE_INPUT: true,
  },

  // Logging
  LOGGING: {
    LOG_AUTH_ATTEMPTS: true,
    LOG_API_REQUESTS: true,
    LOG_ERRORS: true,
    LOG_LEVEL: 'warn', // 'debug', 'info', 'warn', 'error'
  },
} as const;

/**
 * Security headers for API responses
 */
export const SECURITY_HEADERS = {
  'Strict-Transport-Security': `max-age=${SECURITY_CONFIG.HTTPS.HSTS_MAX_AGE}; includeSubDomains`,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;",
} as const;

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < SECURITY_CONFIG.PASSWORD.MIN_LENGTH) {
    errors.push(`Password must be at least ${SECURITY_CONFIG.PASSWORD.MIN_LENGTH} characters long`);
  }
  
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_NUMBERS && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  if (!SECURITY_CONFIG.VALIDATION.SANITIZE_INPUT) {
    return input;
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, SECURITY_CONFIG.VALIDATION.MAX_STRING_LENGTH); // Limit length
}

/**
 * Check if request should be rate limited
 */
export function shouldRateLimit(
  requestCount: number,
  windowStart: number
): boolean {
  if (!SECURITY_CONFIG.RATE_LIMITING.ENABLED) {
    return false;
  }
  
  const now = Date.now();
  const windowAge = now - windowStart;
  
  return (
    windowAge < SECURITY_CONFIG.RATE_LIMITING.WINDOW_MS &&
    requestCount >= SECURITY_CONFIG.RATE_LIMITING.MAX_REQUESTS
  );
}
