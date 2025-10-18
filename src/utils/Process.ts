/**
 * Утилиты для graceful shutdown и управления процессом
 */

import { logger } from './Logger';

/**
 * Настраивает обработчики сигналов для graceful shutdown
 */
export function setupGracefulShutdown(cleanup?: () => Promise<void>): void {
    const handleShutdown = async (signal: string): Promise<void> => {
        logger.info(`\n[${new Date().toISOString()}] Получен сигнал ${signal}, начинаем graceful shutdown...`);

        try {
            if (cleanup) {
                await cleanup();
            }

            logger.info(`[${new Date().toISOString()}] Graceful shutdown завершен`);
            process.exit(0);
        } catch (error) {
            logger.error(`[${new Date().toISOString()}] Ошибка при shutdown:`, error);
            process.exit(1);
        }
    };

    // Обработчики сигналов
    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

    // Обработчики необработанных ошибок
    process.on('unhandledRejection', (reason, promise) => {
        logger.error(`[${new Date().toISOString()}] Unhandled Rejection at:`, promise, 'reason:', reason);
        process.exit(1);
    });

    process.on('uncaughtException', (error) => {
        logger.error(`[${new Date().toISOString()}] Uncaught Exception:`, error);
        process.exit(1);
    });
}

/**
 * Создает функцию задержки
 */
export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry функция с экспоненциальной задержкой
 */
export async function retry<T>(fn: () => Promise<T>, maxAttempts: number = 3, baseDelay: number = 1000): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt === maxAttempts) {
                throw lastError;
            }

            const delayTime = baseDelay * Math.pow(2, attempt - 1);

            logger.warn(`Попытка ${attempt} не удалась, повтор через ${delayTime}ms:`, lastError.message);
            await delay(delayTime);
        }
    }

    throw lastError!;
}
