export function validateZoneName(name) {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "Zone name is required" };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, error: "At least 3 characters" };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: "Maximum 50 characters" };
  }
  
  const regex = /^[a-zA-Z0-9\s\-éèêùôçÀÉ]+$/;
  if (!regex.test(trimmed)) {
    return { valid: false, error: "Only letters, numbers, spaces, and hyphens allowed" };
  }
  
  return { valid: true, error: null };
}

export function validateColor(hex) {
  if (!hex) {
    return { valid: false, error: "Color is required" };
  }
  const regex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!regex.test(hex)) {
    return { valid: false, error: "Invalid color format" };
  }
  return { valid: true, error: null };
}

export function validateDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return { valid: false, error: "Both dates required" };
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (end <= start) {
    return { valid: false, error: "End date must be after start date" };
  }
  
  const now = new Date();
  if (end > now) {
    return { valid: false, error: "End date cannot be in the future" };
  }
  
  return { valid: true, error: null };
}

export function validateAnnotationText(text) {
  if (text && text.length > 500) {
    return { valid: false, error: "Maximum 500 characters" };
  }
  return { valid: true, error: null };
}

export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: "Invalid email address" };
  }
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    return { valid: false, error: "Invalid email address" };
  }
  return { valid: true, error: null };
}

export function validateRequired(value) {
  const isValid = value !== null && value !== undefined && value !== "";
  if (!isValid || (typeof value === 'string' && value.trim() === "")) {
    return { valid: false, error: "This field is required" };
  }
  return { valid: true, error: null };
}

export function validateTextLength(text, min, max) {
  if (!text && min > 0) {
    return { valid: false, error: `Must be between ${min} and ${max} characters` };
  }
  
  const len = text ? text.length : 0;
  if (len < min || len > max) {
    return { valid: false, error: `Must be between ${min} and ${max} characters` };
  }
  
  return { valid: true, error: null };
}
