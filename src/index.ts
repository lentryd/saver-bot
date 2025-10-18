import { Bot } from 'grammy';

import { config } from '@/config';
import { registerFeatures } from '@/features';
import type { IBotContext, IExtendedBot } from '@/types/BotContext';
import { initI18n } from '@/utils/i18n';
import { logger } from '@/utils/Logger';
import { setupGracefulShutdown } from '@/utils/Process';
import { RedisSubscriber } from '@/utils/RedisSubscriber';

/**
 * Основная функция запуска бота
 */
async function main(): Promise<void> {
    // Инициализируем i18next
    await initI18n();

    logger.info('🤖 TikTok Downloader Bot starting...');

    const bot = new Bot<IBotContext>(config.BOT_TOKEN) as IExtendedBot;

    // Инициализируем Redis subscriber для автоматических обновлений
    const redisUrl = process.env.REDIS_URL;
    const redisSubscriber = new RedisSubscriber(bot, redisUrl);

    // Сохраняем redisSubscriber в контекст бота для доступа из features
    bot.redisSubscriber = redisSubscriber;

    // Регистрируем фичи
    await registerFeatures(bot);

    // Обработчик ошибок
    bot.catch((error) => {
        logger.error('Ошибка в боте:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
    });

    // Настраиваем graceful shutdown
    setupGracefulShutdown(async () => {
        logger.info('Останавливаем бота...');
        await redisSubscriber.close();
        await bot.stop();
        logger.info('Бот остановлен');
    });

    // Запускаем бота в polling режиме
    logger.info('🚀 Запуск бота в режиме polling...');
    await bot.start();
}

// Запуск приложения
main().catch((error) => {
    logger.error('Критическая ошибка при запуске бота:', error);
    process.exit(1);
});
