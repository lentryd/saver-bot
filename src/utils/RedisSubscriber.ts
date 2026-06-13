import { RedisClient } from 'bun';
import type { Bot, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';

import { t } from '@/utils/i18n';
import { logger } from '@/utils/Logger';
import { VideoFileResolver } from '@/utils/VideoFileResolver';
import { VideoFormatter } from '@/utils/VideoFormatter';

interface IVideoReadyEvent {
    video_id: string;
    url: string;
    video_url?: string;
    title?: string;
    author?: string;
    length?: number;
    views?: number;
    success: boolean;
    error?: string;
}

interface IVideoSubscription {
    inlineMessageId: string;
}

/**
 * Подписчик на события готовности видео из Redis
 */
export class RedisSubscriber<C extends Context = Context> {
    private redis: RedisClient | null = null;
    private subscriptions: Map<string, IVideoSubscription[]> = new Map();
    private bot: Bot<C>;

    /**
     * Создаёт новый экземпляр подписчика
     */
    public constructor(bot: Bot<C>, redisUrl?: string) {
        this.bot = bot;

        if (!redisUrl) {
            logger.warn('⚠️ REDIS_URL не задан. Redis Pub/Sub отключен.');
            return;
        }

        // Не ждём инициализацию, запускаем асинхронно
        this.initialize(redisUrl).catch((error) => {
            logger.error('Ошибка асинхронной инициализации Redis:', error);
        });
    }

    private async initialize(redisUrl: string): Promise<void> {
        try {
            logger.info(`Подключение к Redis: ${redisUrl}`);

            // Создаём Redis клиент используя Bun
            // RedisClient принимает полный URL redis://host:port
            this.redis = new RedisClient(redisUrl);

            // ВАЖНО: Необходимо вызвать connect() перед использованием
            await this.redis.connect();
            logger.info('✅ Redis connect успешен');

            // Проверяем подключение
            await this.redis.ping();
            logger.info('✅ Redis ping успешен');

            // Запускаем прослушивание в отдельной функции
            this.startListening().catch((error) => {
                logger.error('Ошибка запуска прослушивания:', error);
            });

            logger.info('✅ Redis subscriber подключен');
        } catch (error) {
            logger.error('Ошибка инициализации Redis subscriber:', error);
        }
    }

    /**
     * Запускает прослушивание событий
     */
    private async startListening(): Promise<void> {
        if (!this.redis) return;

        try {
            logger.info('Попытка подписки на канал video:ready...');

            // Согласно документации Bun, subscribe принимает (channel, callback)
            // где callback: (message: string, channel: string) => void
            await this.redis.subscribe('video:ready', (message: string, channel: string) => {
                logger.info('📨 Получено сообщение из Redis:', {
                    channel,
                    messagePreview: message.substring(0, 100),
                });

                if (channel === 'video:ready' && message) {
                    this.handleVideoReady(message).catch((error) => {
                        logger.error('Ошибка обработки сообщения:', error);
                    });
                }
            });

            logger.info('✅ Подписка на канал video:ready активна');
        } catch (error) {
            logger.error('Ошибка подписки на канал:', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                type: typeof error,
                errorObject: error,
            });
        }
    }

    /**
     * Регистрирует подписку на событие готовности видео (только inline сообщения)
     */
    public subscribe(videoId: string, inlineMessageId: string): void {
        if (!this.subscriptions.has(videoId)) {
            this.subscriptions.set(videoId, []);
        }

        this.subscriptions.get(videoId)!.push({ inlineMessageId });
        logger.info(`📝 Подписка добавлена: videoId=${videoId}, inlineMessageId=${inlineMessageId}`);
    }

    /**
     * Удаляет подписку
     */
    public unsubscribe(videoId: string, inlineMessageId: string): void {
        const subs = this.subscriptions.get(videoId);

        if (!subs) return;

        const filtered = subs.filter((s) => s.inlineMessageId !== inlineMessageId);

        if (filtered.length === 0) {
            this.subscriptions.delete(videoId);
        } else {
            this.subscriptions.set(videoId, filtered);
        }

        logger.info(`🗑️ Подписка удалена: videoId=${videoId}, inlineMessageId=${inlineMessageId}`);
    }

    /**
     * Обрабатывает событие готовности видео
     */
    private async handleVideoReady(message: string): Promise<void> {
        try {
            const event: IVideoReadyEvent = JSON.parse(message);

            logger.info(`📢 Получено событие video:ready для videoId: ${event.video_id}`);

            const subs = this.subscriptions.get(event.video_id);

            if (!subs || subs.length === 0) {
                logger.info(`ℹ️ Нет подписчиков для videoId: ${event.video_id}`);
                return;
            }

            // Обрабатываем каждую подписку
            for (const sub of subs) {
                try {
                    await this.updateMessage(sub, event);
                } catch (error) {
                    logger.error(`Ошибка обновления inline сообщения ${sub.inlineMessageId}:`, error);
                }
            }

            // Удаляем все подписки для этого videoId после обработки
            this.subscriptions.delete(event.video_id);
        } catch (error) {
            logger.error('Ошибка обработки события video:ready:', error);
        }
    }

    /**
     * Обновляет inline сообщение с результатом
     */
    private async updateMessage(sub: IVideoSubscription, event: IVideoReadyEvent): Promise<void> {
        const { inlineMessageId } = sub;

        if (!event.success || !event.video_url) {
            // Ошибка загрузки - обновляем caption с сообщением об ошибке, кнопка остается
            const errorText = event.error || t('callback.error.loadErrorDefault');

            // Воссоздаем клавиатуру с кнопкой для повторной попытки
            const keyboard = new InlineKeyboard().text(t('inline.youtubeReady.button'), `load:${event.video_id}`);

            await this.bot.api.editMessageCaptionInline(inlineMessageId, {
                caption: t('callback.error.loadError', { error: errorText }),
                parse_mode: 'Markdown',
                reply_markup: keyboard, // Явно указываем кнопку для повторной попытки
            });

            logger.info(`❌ Ошибка обработки видео inlineMessageId=${inlineMessageId}: ${errorText}`);

            return;
        }

        // Успешная загрузка - заменяем медиа (кнопка удалится, так как медиа заменяется на видео)
        const caption = VideoFormatter.formatVideoCaption({
            title: event.title,
            author: event.author,
            views: event.views,
            duration: event.length,
        });

        try {
            // Telegram не может скачать прямой URL для inline-сообщения,
            // поэтому заливаем видео в служебный чат и берём file_id.
            const fileId = await VideoFileResolver.resolveFileId(this.bot.api, event.video_url);

            await this.bot.api.editMessageMediaInline(inlineMessageId, {
                type: 'video',
                media: fileId ?? event.video_url,
                caption,
                parse_mode: 'Markdown',
            });

            logger.info(`✅ Видео обновлено inlineMessageId=${inlineMessageId}, videoId=${event.video_id}`);
        } catch (error) {
            logger.error('Ошибка отправки видео:', error);

            // Если не удалось отправить видео, обновляем caption с ошибкой, кнопка остается
            const keyboard = new InlineKeyboard().text(t('inline.youtubeReady.button'), `load:${event.video_id}`);

            await this.bot.api.editMessageCaptionInline(inlineMessageId, {
                caption: t('callback.error.sendError'),
                parse_mode: 'Markdown',
                reply_markup: keyboard, // Явно указываем кнопку для повторной попытки
            });
        }
    }

    /**
     * Закрывает соединения с Redis
     */
    public async close(): Promise<void> {
        if (this.redis) {
            // Для Bun.redis может не быть метода quit, просто очищаем ссылку
            this.redis = null;
            logger.info('Redis subscriber отключен');
        }
    }
}
