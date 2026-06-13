import type { Context, MiddlewareFn, NextFunction } from 'grammy';

import { logger } from './Logger';

/**
 * Ошибка превышения времени обработки апдейта
 */
export class HandlerTimeoutError extends Error {
    /**
     * Создаёт ошибку таймаута обработки апдейта
     */
    public constructor(public readonly timeoutMs: number) {
        super(`Handler timed out after ${timeoutMs}ms`);
        this.name = 'HandlerTimeoutError';
    }
}

/**
 * Создаёт middleware, ограничивающее время обработки одного апдейта.
 *
 * Если хендлер «зависает» (например, внешний запрос не отвечает и не
 * прерывается по таймауту), это middleware не даст ему блокировать обработку
 * бесконечно: по истечении лимита проброшенная ошибка попадёт в bot.catch,
 * а апдейт будет считаться обработанным.
 */
export function timeoutMiddleware<C extends Context>(timeoutMs: number): MiddlewareFn<C> {
    return async (ctx: C, next: NextFunction): Promise<void> => {
        let timer: ReturnType<typeof setTimeout> | undefined;

        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
                logger.warn('Обработка апдейта превысила таймаут', {
                    updateId: ctx.update.update_id,
                    timeoutMs,
                });
                reject(new HandlerTimeoutError(timeoutMs));
            }, timeoutMs);
        });

        try {
            await Promise.race([next(), timeout]);
        } finally {
            if (timer) {
                clearTimeout(timer);
            }
        }
    };
}
