import { InlineKeyboard } from 'grammy';
import type { InlineQueryResultArticle } from 'grammy/types';

import type { IBot } from '@/types/Bot';
import type { IBotContext } from '@/types/BotContext';
import { IBaseBotFeature } from '@/types/Feature';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/Logger';
import { TikTokDownloader } from '@/utils/TikTokDownloader';
import { videoCache } from '@/utils/VideoCache';
import { VideoIdGenerator } from '@/utils/VideoIdGenerator';
import { videoIdStorage } from '@/utils/VideoIdStorage';

/**
 * Фича для обработки inline запросов с видео из TikTok и YouTube Shorts
 */
export class InlineQueryFeature extends IBaseBotFeature {
    public readonly name = 'InlineQueryFeature';
    public readonly priority = 10;

    private tiktokDownloader: TikTokDownloader;
    private bot?: IBot;

    /**
     * Конструктор
     */
    public constructor() {
        super();
        this.tiktokDownloader = new TikTokDownloader();
    }

    /**
     * Инициализация фичи
     */
    public init(bot: IBot): void {
        this.bot = bot;
        this.registerHandlers(bot);
    }

    /**
     * Регистрирует обработчики
     */
    private registerHandlers(bot: IBot): void {
        // Обрабатываем inline запросы
        bot.on('inline_query', this.handleInlineQuery.bind(this));

        // Обрабатываем выбор результата из inline запроса
        bot.on('chosen_inline_result', this.handleChosenInlineResult.bind(this));
    }

    /**
     * Обрабатывает inline запрос
     */
    private async handleInlineQuery(ctx: IBotContext): Promise<void> {
        try {
            const query = ctx.inlineQuery?.query?.trim() || '';

            logger.info('Получен inline запрос:', {
                userId: ctx.from?.id,
                query,
            });

            // Если запрос пустой, показываем инструкцию
            if (!query) {
                await ctx.answerInlineQuery(
                    [
                        {
                            type: 'article',
                            id: 'help',
                            title: t('inline.empty.title'),
                            description: t('inline.empty.description'),
                            input_message_content: {
                                message_text:
                                    '🎬 *Video Downloader*\n\n' +
                                    'Поддерживаемые платформы:\n' +
                                    '• TikTok\n' +
                                    '• YouTube Shorts\n\n' +
                                    'Как использовать:\n' +
                                    '1️⃣ Скопируйте ссылку на видео\n' +
                                    '2️⃣ Вставьте ссылку в любой чат\n' +
                                    '3️⃣ Выберите бота из списка\n' +
                                    '4️⃣ Нажмите на результат для отправки видео',
                                parse_mode: 'Markdown',
                            },
                            thumbnail_url:
                                'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Ionicons_logo-tiktok.svg/512px-Ionicons_logo-tiktok.svg.png',
                        } as InlineQueryResultArticle,
                    ],
                    {
                        cache_time: 300,
                        is_personal: true,
                    }
                );

                return;
            }

            // Проверяем, является ли запрос ссылкой на поддерживаемую платформу
            if (!TikTokDownloader.isValidUrl(query)) {
                await ctx.answerInlineQuery(
                    [
                        {
                            type: 'article',
                            id: 'invalid_url',
                            title: t('inline.invalidUrl.title'),
                            description: t('inline.invalidUrl.description'),
                            input_message_content: {
                                message_text: t('inline.invalidUrl.message'),
                                parse_mode: 'Markdown',
                            },
                            thumbnail_url:
                                'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Red_X.svg/512px-Red_X.svg.png',
                        } as InlineQueryResultArticle,
                    ],
                    {
                        cache_time: 10,
                        is_personal: true,
                    }
                );

                return;
            }

            // Для YouTube Shorts проверяем кеш
            const platform = TikTokDownloader.detectPlatform(query);

            if (platform === 'youtube') {
                // Извлекаем ID видео для thumbnail
                const youtubeId = query.match(/shorts\/([^?]+)/)?.[1] || 'default';
                const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;

                // Проверяем кеш
                const cached = videoCache.get(query);

                if (cached && cached.videoUrl) {
                    // Видео уже в кеше - отправляем сразу
                    logger.info('Видео найдено в кеше для inline query:', { url: query });

                    await ctx.answerInlineQuery(
                        [
                            {
                                type: 'video',
                                id: `cached_${youtubeId}`,
                                title: cached.title || '📹 YouTube Shorts',
                                description: cached.author || 'YouTube Creator',
                                video_url: cached.videoUrl,
                                mime_type: 'video/mp4',
                                thumbnail_url: cached.thumbnail || thumbnailUrl,
                                caption:
                                    '📹 *YouTube Shorts*\n\n' +
                                    `*${cached.title || 'YouTube Shorts'}*\n` +
                                    `👤 ${cached.author || 'YouTube Creator'}\n\n` +
                                    `� [Открыть в YouTube](${query})`,
                                parse_mode: 'Markdown',
                            },
                        ],
                        {
                            cache_time: 300, // Кешируем на 5 минут
                            is_personal: true,
                        }
                    );

                    return;
                }

                // Видео не в кеше - создаем короткий ID и сохраняем маппинг
                const videoId = VideoIdGenerator.generate(query);

                videoIdStorage.set(videoId, query);
                logger.info('VideoId создан и сохранен:', { videoId, url: query });

                // Создаем inline keyboard с кнопкой загрузки
                const keyboard = new InlineKeyboard().text(t('inline.youtubeReady.button'), `load:${videoId}`);

                // Отвечаем с постером (фото), которое потом заменим на видео
                await ctx.answerInlineQuery(
                    [
                        {
                            type: 'photo',
                            id: videoId,
                            title: t('inline.youtubeReady.title'),
                            description: t('inline.youtubeReady.description'),
                            photo_url: thumbnailUrl,
                            thumbnail_url: thumbnailUrl,
                            caption:
                                '📹 *YouTube Shorts*\n\n' +
                                'Загрузка YouTube видео может занять 10-15 секунд.\n' +
                                'Нажмите кнопку ниже, чтобы начать загрузку.\n\n' +
                                t('inline.openIn', { platform: t('platform.youtube'), url: query }),
                            parse_mode: 'Markdown',
                            reply_markup: keyboard,
                        },
                    ],
                    {
                        cache_time: 1,
                        is_personal: true,
                    }
                );

                return;
            }

            // Загружаем информацию о видео (только для TikTok, так как он быстрый)
            const result = await this.tiktokDownloader.downloadVideo(query);

            if (!result.success || !result.video) {
                logger.error('Ошибка при загрузке видео:', result.error);

                await ctx.answerInlineQuery(
                    [
                        {
                            type: 'article',
                            id: 'error',
                            title: t('inline.loadError.title'),
                            description: result.error || t('inline.loadError.unknownError'),
                            input_message_content: {
                                message_text: t('inline.loadError.message', {
                                    error: result.error || t('inline.loadError.unknownError'),
                                }),
                                parse_mode: 'Markdown',
                            },
                            thumbnail_url:
                                'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Red_X.svg/512px-Red_X.svg.png',
                        } as InlineQueryResultArticle,
                    ],
                    {
                        cache_time: 10,
                        is_personal: true,
                    }
                );

                return;
            }

            const video = result.video;

            // Формируем результаты для отправки
            const results: InlineQueryResultArticle[] = [];

            // Для TikTok отправляем только видео
            if (video.platform === 'tiktok' && video.videoUrl) {
                results.push({
                    type: 'video',
                    id: `video_${video.id}`,
                    video_url: video.videoUrl,
                    mime_type: 'video/mp4',
                    thumbnail_url: video.coverUrl || video.url,
                    title: `📹 ${video.author}`,
                    description: video.description.substring(0, 100) || 'TikTok Video',
                    caption: this.tiktokDownloader.formatVideoInfo(video),
                    parse_mode: 'Markdown',
                } as any);
            } else {
                // Для YouTube отправляем статью с кнопкой загрузки
                const platformName = video.platform === 'tiktok' ? t('platform.tiktok') : t('platform.youtube');
                const platformEmoji = t(`video.emoji.${video.platform}`);

                results.push({
                    type: 'article',
                    id: `info_${video.id}`,
                    title: `${platformEmoji} ${video.author}`,
                    description: video.description.substring(0, 100) || `${platformName} Video Info`,
                    input_message_content: {
                        message_text: `${this.tiktokDownloader.formatVideoInfo(video)}\n\n${t('inline.openIn', { platform: platformName, url: video.url })}`,
                        parse_mode: 'Markdown',
                    },
                    thumbnail_url:
                        video.coverUrl ||
                        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Ionicons_logo-tiktok.svg/512px-Ionicons_logo-tiktok.svg.png',
                } as InlineQueryResultArticle);
            }

            // Отправляем результаты
            await ctx.answerInlineQuery(results, {
                cache_time: 3600, // Кешируем на 1 час
                is_personal: false,
            });

            logger.info('Inline запрос успешно обработан:', {
                userId: ctx.from?.id,
                videoId: video.id,
                author: video.authorUsername,
            });
        } catch (error) {
            logger.error('Ошибка при обработке inline запроса:', error);

            // Пытаемся отправить сообщение об ошибке
            try {
                await ctx.answerInlineQuery(
                    [
                        {
                            type: 'article',
                            id: 'error',
                            title: t('inline.generalError.title'),
                            description: t('inline.generalError.description'),
                            input_message_content: {
                                message_text: t('inline.generalError.message'),
                                parse_mode: 'Markdown',
                            },
                        } as InlineQueryResultArticle,
                    ],
                    {
                        cache_time: 10,
                        is_personal: true,
                    }
                );
            } catch {
                // Игнорируем ошибку если не удалось отправить ответ
            }
        }
    }

    /**
     * Обрабатывает выбор результата из inline запроса
     */
    private async handleChosenInlineResult(ctx: IBotContext): Promise<void> {
        try {
            const resultId = ctx.chosenInlineResult?.result_id;
            const query = ctx.chosenInlineResult?.query;
            const inlineMessageId = ctx.chosenInlineResult?.inline_message_id;

            logger.info('Выбран результат inline запроса:', {
                userId: ctx.from?.id,
                resultId,
                query,
                inlineMessageId,
            });

            // Если это YouTube видео (resultId = videoId) и есть redisSubscriber
            if (resultId && inlineMessageId && this.bot?.redisSubscriber && query?.includes('youtube.com')) {
                // Регистрируем подписку для автоматического обновления
                // inlineMessageId имеет формат, но нам нужно извлечь chatId и messageId
                // К сожалению, для inline сообщений у нас нет прямого доступа к chatId/messageId
                // Они доступны только через inline_message_id

                // Сохраняем mapping: videoId -> inline_message_id для последующего обновления
                logger.info('YouTube видео выбрано через inline:', { videoId: resultId, inlineMessageId });

                // TODO: Для inline сообщений нужно использовать editMessageTextInline/editMessageMediaInline
                // Сейчас пропускаем подписку для inline сообщений
            }
        } catch (error) {
            logger.error('Ошибка при обработке выбранного результата:', error);
        }
    }
}
