import { config } from '../../config';
import { logger } from '../Logger';
import { HttpError } from './HttpError';
import type { HttpRequestConfig, HttpResponse } from './types';

/**
 * HTTP-клиент для работы с API
 */
class HttpClient {
    private readonly baseUrl: string;
    private readonly defaultHeaders: Record<string, string>;
    private readonly defaultTimeout: number;

    /**
     * Создает новый экземпляр HTTP-клиента
     */
    public constructor(baseUrl?: string, defaultHeaders?: Record<string, string>, timeout?: number) {
        this.baseUrl = baseUrl || '';
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...defaultHeaders,
        };
        this.defaultTimeout = timeout || config.HTTP_TIMEOUT;
    }

    /**
     * Выполнить HTTP-запрос
     */
    private async request<T = unknown>(url: string, config: HttpRequestConfig = {}): Promise<HttpResponse<T>> {
        const { method = 'GET', headers = {}, body, timeout = this.defaultTimeout, params = {} } = config;

        const fullUrl = this.buildUrl(url);
        const requestHeaders = { ...this.defaultHeaders, ...headers };

        logger.debug(`${method} ${fullUrl}`, { headers: requestHeaders, body, params });

        // Создаем AbortController для таймаута
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const urlWithParams = this.buildUrlWithParams(fullUrl, params);
            const response = await fetch(urlWithParams, {
                method,
                headers: requestHeaders,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const responseText = await response.text();
            let data: T;

            try {
                data = responseText ? JSON.parse(responseText) : null;
            } catch {
                // Если не удается распарсить JSON, возвращаем как есть
                data = responseText as unknown as T;
            }

            if (!response.ok) {
                const errorMessage = `HTTP ${response.status}: ${response.statusText}`;

                logger.error(errorMessage, { url: fullUrl, status: response.status, data });

                return {
                    data,
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                };
            }

            logger.debug(`Response: ${response.status} ${response.statusText}`, { data });

            return {
                data,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
            };
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof HttpError) {
                throw error;
            }

            if (error instanceof Error && error.name === 'AbortError') {
                const timeoutError = new HttpError(`Request timeout after ${timeout}ms`, 408, 'Request Timeout');

                logger.error('Request timeout', { url: fullUrl, timeout });
                throw timeoutError;
            }

            const networkError = new HttpError(
                `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                0,
                'Network Error'
            );

            logger.error('Network error', { url: fullUrl, error });
            throw networkError;
        }
    }

    /**
     * GET-запрос
     */
    public async get<T = unknown>(
        url: string,
        config?: Omit<HttpRequestConfig, 'method' | 'body'>
    ): Promise<HttpResponse<T>> {
        return this.request<T>(url, { ...config, method: 'GET' });
    }

    /**
     * POST-запрос
     */
    public async post<T = unknown>(
        url: string,
        body?: unknown,
        config?: Omit<HttpRequestConfig, 'method'>
    ): Promise<HttpResponse<T>> {
        return this.request<T>(url, { ...config, method: 'POST', body });
    }

    /**
     * PUT-запрос
     */
    public async put<T = unknown>(
        url: string,
        body?: unknown,
        config?: Omit<HttpRequestConfig, 'method'>
    ): Promise<HttpResponse<T>> {
        return this.request<T>(url, { ...config, method: 'PUT', body });
    }

    /**
     * Построить полный URL
     */
    private buildUrl(url: string): string {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
        const path = url.startsWith('/') ? url : `/${url}`;

        return `${baseUrl}${path}`;
    }

    /**
     * Построить URL с параметрами запроса
     */
    private buildUrlWithParams(url: string, params: HttpRequestConfig['params']): string {
        if (!params || Object.keys(params).length === 0) {
            return url;
        }

        const urlObj = new URL(url);

        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null) {
                return;
            }

            urlObj.searchParams.set(key, String(value));
        });

        return urlObj.toString();
    }
}

/**
 * Экспортируем класс для создания новых экземпляров
 */
export { HttpClient };
