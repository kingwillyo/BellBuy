/**
 * Centralized validation utilities for form inputs and data
 * Provides consistent validation across the application
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export interface PasswordValidationResult extends ValidationResult {
  requirements?: PasswordRequirements;
}

/**
 * Email validation using RFC 5322 compliant regex
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email || typeof email !== "string") {
    return { isValid: false, error: "Email is required" };
  }

  const trimmedEmail = email.trim();
  if (trimmedEmail.length === 0) {
    return { isValid: false, error: "Email cannot be empty" };
  }

  // RFC 5322 compliant email regex (simplified version)
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  if (trimmedEmail.length > 254) {
    return { isValid: false, error: "Email address is too long" };
  }

  return { isValid: true };
};

/**
 * Password validation with detailed requirements
 */
export const validatePassword = (
  password: string
): PasswordValidationResult => {
  if (!password || typeof password !== "string") {
    return {
      isValid: false,
      error: "Password is required",
      requirements: {
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecialChar: false,
      },
    };
  }

  const requirements: PasswordRequirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isValid = Object.values(requirements).every(Boolean);

  return {
    isValid,
    requirements,
    error: isValid
      ? undefined
      : "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
  };
};

/**
 * Name validation (for full names, product names, etc.)
 */
export const validateName = (
  name: string,
  fieldName: string = "Name"
): ValidationResult => {
  if (!name || typeof name !== "string") {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return { isValid: false, error: `${fieldName} cannot be empty` };
  }

  if (trimmedName.length < 2) {
    return {
      isValid: false,
      error: `${fieldName} must be at least 2 characters long`,
    };
  }

  if (trimmedName.length > 100) {
    return {
      isValid: false,
      error: `${fieldName} is too long (maximum 100 characters)`,
    };
  }

  // Check for potentially malicious content
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmedName)) {
      return {
        isValid: false,
        error: `${fieldName} contains invalid characters`,
      };
    }
  }

  return { isValid: true };
};

/**
 * Phone number validation (basic international format)
 */
export const validatePhoneNumber = (phone: string): ValidationResult => {
  if (!phone || typeof phone !== "string") {
    return { isValid: false, error: "Phone number is required" };
  }

  const cleanedPhone = phone.replace(/\D/g, ""); // Remove non-digits

  if (cleanedPhone.length < 10) {
    return { isValid: false, error: "Phone number must be at least 10 digits" };
  }

  if (cleanedPhone.length > 15) {
    return { isValid: false, error: "Phone number is too long" };
  }

  return { isValid: true };
};

/**
 * Price validation for products
 */
export const validatePrice = (price: number | string): ValidationResult => {
  if (price === null || price === undefined || price === "") {
    return { isValid: false, error: "Price is required" };
  }

  const numPrice = typeof price === "string" ? parseFloat(price) : price;

  if (isNaN(numPrice)) {
    return { isValid: false, error: "Price must be a valid number" };
  }

  if (numPrice < 0) {
    return { isValid: false, error: "Price cannot be negative" };
  }

  if (numPrice > 1000000) {
    return { isValid: false, error: "Price is too high (maximum $1,000,000)" };
  }

  // Check for reasonable decimal places (max 2)
  const decimalPlaces = (numPrice.toString().split(".")[1] || "").length;
  if (decimalPlaces > 2) {
    return { isValid: false, error: "Price can have maximum 2 decimal places" };
  }

  return { isValid: true };
};

/**
 * Description validation for products, reviews, etc.
 */
export const validateDescription = (
  description: string,
  fieldName: string = "Description"
): ValidationResult => {
  if (!description || typeof description !== "string") {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const trimmedDescription = description.trim();

  if (trimmedDescription.length === 0) {
    return { isValid: false, error: `${fieldName} cannot be empty` };
  }

  if (trimmedDescription.length < 10) {
    return {
      isValid: false,
      error: `${fieldName} must be at least 10 characters long`,
    };
  }

  if (trimmedDescription.length > 2000) {
    return {
      isValid: false,
      error: `${fieldName} is too long (maximum 2000 characters)`,
    };
  }

  return { isValid: true };
};

/**
 * URL validation for external links
 */
export const validateUrl = (url: string): ValidationResult => {
  if (!url || typeof url !== "string") {
    return { isValid: false, error: "URL is required" };
  }

  const trimmedUrl = url.trim();

  if (trimmedUrl.length === 0) {
    return { isValid: false, error: "URL cannot be empty" };
  }

  try {
    const urlObj = new URL(trimmedUrl);

    // Only allow http and https protocols
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return { isValid: false, error: "URL must use HTTP or HTTPS protocol" };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: "Please enter a valid URL" };
  }
};

/**
 * UUID validation
 */
export const validateUuid = (uuid: string): ValidationResult => {
  if (!uuid || typeof uuid !== "string") {
    return { isValid: false, error: "ID is required" };
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(uuid)) {
    return { isValid: false, error: "Invalid ID format" };
  }

  return { isValid: true };
};

/**
 * Sanitize input to prevent XSS attacks
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== "string") {
    return "";
  }

  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
};

/**
 * Validate form data object
 */
export const validateFormData = (
  data: Record<string, any>,
  rules: Record<string, (value: any) => ValidationResult>
): Record<string, string> => {
  const errors: Record<string, string> = {};

  Object.entries(rules).forEach(([field, validator]) => {
    const result = validator(data[field]);
    if (!result.isValid && result.error) {
      errors[field] = result.error;
    }
  });

  return errors;
};

/**
 * Common validation rules for forms
 */
export const commonValidationRules = {
  email: validateEmail,
  password: validatePassword,
  fullName: (name: string) => validateName(name, "Full Name"),
  productName: (name: string) => validateName(name, "Product Name"),
  phone: validatePhoneNumber,
  price: validatePrice,
  description: validateDescription,
  url: validateUrl,
  uuid: validateUuid,
};
