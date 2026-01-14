const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
};

/**
 * Calculate delay for exponential backoff with jitter
 */
function calculateBackoff(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
  return Math.min(exponentialDelay + jitter, config.maxDelay);
}

/**
 * Determine if an error should trigger a retry
 */
function isRetryableError(error: unknown, status?: number): boolean {
  // Retry on network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Retry on certain HTTP status codes
  if (status) {
    return status === 429 || status === 502 || status === 503 || status === 504;
  }

  return false;
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
  addTrailingSlash = false,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  const { params, ...fetchOptions } = options;

  // Normalize endpoint - ensure it starts with /
  let normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Remove any trailing slashes
  normalizedEndpoint = normalizedEndpoint.replace(/\/+$/, '');

  // Only add trailing slash for GET requests (FastAPI list endpoints need them)
  if (addTrailingSlash) {
    normalizedEndpoint += '/';
  }

  let url = `${API_BASE_URL}/api/v1${normalizedEndpoint}`;

  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'An error occurred' }));
        const error = new Error(errorData.detail || errorData.error || `HTTP error! status: ${response.status}`);

        // Check if we should retry
        if (attempt < retryConfig.maxRetries && isRetryableError(error, response.status)) {
          lastError = error;
          const delay = calculateBackoff(attempt, retryConfig);
          console.warn(`Request failed (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}), retrying in ${Math.round(delay)}ms...`);
          await sleep(delay);
          continue;
        }

        throw error;
      }

      return response.json();
    } catch (error) {
      // Check if we should retry on network errors
      if (attempt < retryConfig.maxRetries && isRetryableError(error)) {
        lastError = error as Error;
        const delay = calculateBackoff(attempt, retryConfig);
        console.warn(`Request failed (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}), retrying in ${Math.round(delay)}ms...`);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  // If we exhausted all retries, throw the last error
  throw lastError || new Error('Request failed after retries');
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string>) =>
    request<T>(endpoint, { method: 'GET', params }, true), // GET requests need trailing slash for list endpoints

  post: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }, true), // POST to collection needs trailing slash

  put: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }), // PUT to resource - no trailing slash

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }, true), // DELETE needs trailing slash for FastAPI
};

export default api;
