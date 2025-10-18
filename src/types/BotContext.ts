import type { Bot, Context } from 'grammy';

import type { RedisSubscriber } from '@/utils/RedisSubscriber';

/**
 * Расширенный контекст бота с дополнительными методами и данными
 */
export interface IExtendedBotContext {
    /**
     * Получить имя пользователя (username или first_name)
     */
    getUserName(): string | undefined;

    /**
     * Получить ID пользователя
     */
    getUserId(): number | undefined;

    /**
     * Проверить, есть ли информация о пользователе
     */
    hasUserInfo(): boolean;
}

/**
 * Контекст бота с дополнительными методами
 */
export type IBotContext = Context & IExtendedBotContext;

/**
 * Расширенный тип Bot с дополнительными свойствами
 */
export interface IExtendedBot extends Bot<IBotContext> {
    redisSubscriber?: RedisSubscriber<IBotContext>;
}
