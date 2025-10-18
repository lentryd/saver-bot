import type { IBot } from '@/types/Bot';
import { featureManager } from '@/utils/FeatureManager';
import { logger } from '@/utils/Logger';

import { CallbackQueryFeature } from './CallbackQueryFeature';
import { InlineQueryFeature } from './InlineQueryFeature';
import { StartFeature } from './StartFeature';

/**
 * Регистрирует все фичи бота
 */
export async function registerFeatures(bot: IBot): Promise<void> {
    logger.info('🚀 Starting feature registration...');

    // Регистрируем фичи статически
    const features = [new StartFeature(), new CallbackQueryFeature(), new InlineQueryFeature()];

    // Регистрируем все фичи
    featureManager.registerFeatures(features);

    // Инициализируем все зарегистрированные фичи
    await featureManager.initializeFeatures(bot);

    // Логируем информацию о загруженных фичах
    const loadedFeatures = featureManager.getFeatureInfos();

    logger.info(`📊 Loaded ${loadedFeatures.length} feature(s)`);

    for (const feature of loadedFeatures) {
        logger.info(`   📦 ${feature.name}`);
    }
}
