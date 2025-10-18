import type { IBot } from './Bot';

/**
 * Абстрактный базовый класс для всех фич бота
 */
export abstract class IBaseBotFeature {
    /**
     * Уникальное название фичи
     */
    public abstract readonly name: string;

    /**
     * Приоритет фичи (для сортировки при инициализации)
     */
    public abstract readonly priority: number;

    /**
     * Инициализация фичи
     * Вызывается при регистрации фичи в боте
     */
    public abstract init(bot: IBot): void;
}
