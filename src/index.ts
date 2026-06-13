import { run } from '@grammyjs/runner';
import { Bot } from 'grammy';

import { config } from '@/config';
import { registerFeatures } from '@/features';
import type { IBotContext, IExtendedBot } from '@/types/BotContext';
import { initI18n } from '@/utils/i18n';
import { logger } from '@/utils/Logger';
import { setupGracefulShutdown } from '@/utils/Process';
import { RedisSubscriber } from '@/utils/RedisSubscriber';
import { timeoutMiddleware } from '@/utils/timeoutMiddleware';

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

    // Ограничиваем время обработки одного апдейта, чтобы зависший запрос
    // не блокировал бота. Должно стоять до регистрации фич.
    bot.use(timeoutMiddleware(config.HANDLER_TIMEOUT));

    // Регистрируем фичи
    await registerFeatures(bot);

    // Обработчик ошибок
    bot.catch((error) => {
        logger.error('Ошибка в боте:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
    });

    // Запускаем бота в polling режиме с конкурентной обработкой апдейтов.
    // Один медленный/зависший апдейт не блокирует остальные.
    logger.info('🚀 Запуск бота в режиме polling...');

    const runner = run(bot);

    // Настраиваем graceful shutdown
    setupGracefulShutdown(async () => {
        logger.info('Останавливаем бота...');
        await redisSubscriber.close();

        if (runner.isRunning()) {
            await runner.stop();
        }

        logger.info('Бот остановлен');
    });

    // Ждём завершения работы раннера
    await runner.task();
}

// Запуск приложения
main().catch((error) => {
    logger.error('Критическая ошибка при запуске бота:', error);
    process.exit(1);
});
