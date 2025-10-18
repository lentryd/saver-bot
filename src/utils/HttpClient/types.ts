/**
 * Конфигурация для HTTP-запроса
 */
export interface HttpRequestConfig {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    timeout?: number;
}

/**
 * Ответ HTTP-запроса
 */
export interface HttpResponse<T = unknown> {
    data: T;
    status: number;
    statusText: string;
    headers: Headers;
}
