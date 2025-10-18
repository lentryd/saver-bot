import type { IBot } from '@/types/Bot';
import type { IBaseBotFeature } from '@/types/Feature';
import { logger } from '@/utils/Logger';

/**
 * Менеджер для управления фичами бота
 */
class FeatureManager {
    private features: IBaseBotFeature[] = [];

    /**
     * Регистрирует фичи в менеджере
     */
    public registerFeatures(features: IBaseBotFeature[]): void {
        this.features = features.sort((a, b) => a.priority - b.priority);
        logger.info(`Зарегистрировано ${this.features.length} фич(и)`);
    }

    /**
     * Инициализирует все зарегистрированные фичи
     */
    public async initializeFeatures(bot: IBot): Promise<void> {
        for (const feature of this.features) {
            try {
                feature.init(bot);
                logger.info(`✅ Фича ${feature.name} инициализирована`);
            } catch (error) {
                logger.error(`❌ Ошибка инициализации фичи ${feature.name}:`, error);
                throw error;
            }
        }
    }

    /**
     * Получает информацию о зарегистрированных фичах
     */
    public getFeatureInfos(): Array<{ name: string; priority: number }> {
        return this.features.map((f) => ({
            name: f.name,
            priority: f.priority,
        }));
    }
}

/**
 * Глобальный экземпляр менеджера фич
 */
export const featureManager = new FeatureManager();
