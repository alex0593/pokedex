// Todas las llamadas API van a /api/... (mismo origen).
// Next.js las proxia al backend en el servidor — funciona desde cualquier dispositivo.
// Ver next.config.ts → rewrites()
const BASE_URL = '/api';
const DEFAULT_TIMEOUT = 10000; // 10s

interface FetchOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    body?: unknown;
    timeout?: number;
    retries?: number;
}

class ApiError extends Error {
    constructor(
        public statusCode: number,
        message: string,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiClient<T = unknown>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    const {
        method = 'GET',
        headers = {},
        body,
        timeout = DEFAULT_TIMEOUT,
        retries = 3,
    } = options;

    const url = `${BASE_URL}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorDetail = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorDetail = errorData.detail || errorDetail;
                } catch {
                    // If response is not JSON, use status message
                }
                // 401 → la sesión está caducada o el usuario no existe en DB.
                // Emitimos un evento global para que AuthContext limpie el localStorage.
                if (response.status === 401 && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                }
                throw new ApiError(response.status, errorDetail);
            }

            const data = await response.json();
            return data as T;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Don't retry on 4xx errors (except timeouts)
            if (lastError instanceof ApiError && lastError.statusCode >= 400 && lastError.statusCode < 500) {
                throw lastError;
            }

            // If this is the last attempt, throw
            if (attempt === retries) {
                throw lastError;
            }

            // Exponential backoff: 100ms, 200ms, 400ms, 800ms...
            const delayMs = Math.min(100 * Math.pow(2, attempt), 5000);
            await sleep(delayMs);
        }
    }

    throw lastError || new Error('Unknown error');
}

export { ApiError };
