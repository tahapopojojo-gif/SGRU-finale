const LOG_KEY = 'app_error_logs';
const MAX_LOGS = 50;

export function logError(error, context = {}) {
  const errorId = Date.now().toString() + '.' + Math.random().toString(36).substr(2, 9);
  const timestamp = new Date().toISOString();
  
  const errorObj = {
    errorId,
    timestamp,
    message: typeof error === 'string' ? error : error.message || error.toString(),
    stack: error?.stack,
    context
  };

  try {
    let logs = [];
    const existingLogs = localStorage.getItem(LOG_KEY);
    if (existingLogs) {
      logs = JSON.parse(existingLogs);
    }
    
    logs.unshift(errorObj);
    if (logs.length > MAX_LOGS) {
      logs = logs.slice(0, MAX_LOGS);
    }
    
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to write to localStorage error log', e);
  }

  const isDev = (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') || 
                (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV);
                
  if (isDev) {
    console.error('Logged Error:', errorObj);
  }

  return { errorId, logged: true, timestamp };
}

export function handleAPIError(error, fallbackMessage = null) {
  let code = error?.status || error?.response?.status || error?.code || 500;
  let userMessage = fallbackMessage;
  let retryable = false;

  const msg = error?.message ? error.message.toLowerCase() : '';

  if (msg.includes('network') || msg.includes('failed to fetch')) {
    userMessage = userMessage || "Connection failed. Check your internet.";
    retryable = true;
    code = 'NETWORK_ERROR';
  } else if (msg.includes('timeout')) {
    userMessage = userMessage || "Request timeout. Please try again.";
    retryable = true;
    code = 'TIMEOUT';
  } else {
    switch (code) {
      case 400:
        userMessage = userMessage || "Invalid data. Please check your input.";
        break;
      case 401:
        userMessage = userMessage || "Your session expired. Please log in again.";
        break;
      case 403:
        userMessage = userMessage || "You don't have permission for this action.";
        break;
      case 404:
        userMessage = userMessage || "Resource not found.";
        break;
      case 429:
        userMessage = userMessage || "Too many requests. Please wait a moment.";
        retryable = true;
        break;
      case 500:
      default:
        userMessage = userMessage || "Server error. Please try again later.";
        if (typeof code === 'number' && code >= 500) {
            retryable = true;
        }
        break;
    }
  }

  return { code, userMessage, retryable };
}

export function handleNetworkError(error) {
  let isNetworkError = false;
  let message = "An unknown error occurred.";
  let retryable = false;

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    isNetworkError = true;
    message = "No internet connection detected.";
    retryable = true;
  } else if (error && error.message) {
    const msg = error.message.toLowerCase();
    if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('cors')) {
      isNetworkError = true;
      message = "Network connection failed.";
      retryable = true;
    } else if (msg.includes('timeout')) {
      isNetworkError = true;
      message = "The request timed out.";
      retryable = true;
    }
  }

  return { isNetworkError, message, retryable };
}

export async function retry(fn, maxAttempts = 3, delayMs = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

export function handleAIServiceError(error) {
  const result = {
    isAIError: true,
    type: 'unknown',
    fallback: false,
    message: "AI service encountered an error.",
    retryable: false
  };

  const msg = error && error.message ? error.message.toLowerCase() : '';
  const status = error?.status || error?.response?.status;

  if (msg.includes('timeout') || msg.includes('6s') || status === 408 || error?.code === 'ECONNABORTED') {
    result.isTimeout = true;
    result.fallback = true;
    result.type = 'timeout';
    result.message = "AI service request timed out.";
    result.retryable = true;
  } else if (msg.includes('cors') || msg.includes('network error')) {
    result.isCORSBlocked = true;
    result.fallback = true;
    result.type = 'cors';
    result.message = "AI service blocked by CORS.";
    result.retryable = true;
  } else if (status === 429 || msg.includes('429') || msg.includes('rate limit')) {
    result.isRateLimit = true;
    result.retryAfter = 60;
    result.type = 'rate_limit';
    result.message = "AI service rate limit exceeded. Please wait.";
    result.retryable = true;
  }

  return result;
}

export function clearErrorLog() {
  try {
    localStorage.removeItem(LOG_KEY);
    return { cleared: true };
  } catch (e) {
    return { cleared: false, error: e };
  }
}

export function getErrorLog(limit = 10) {
  try {
    const logs = localStorage.getItem(LOG_KEY);
    if (logs) {
      const parsedLogs = JSON.parse(logs);
      return parsedLogs.slice(0, limit);
    }
  } catch (e) {
    console.error('Failed to read error logs', e);
  }
  return [];
}
