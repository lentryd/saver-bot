import { InlineKeyboard } from 'grammy';

import type { IBot } from '@/types/Bot';
import type { IBotContext } from '@/types/BotContext';
import { IBaseBotFeature } from '@/types/Feature';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/Logger';
import { VideoFormatter } from '@/utils/VideoFormatter';
import { videoIdStorage } from '@/utils/VideoIdStorage';
import { youtubeVideoService } from '@/utils/YouTubeVideoService';

/**
 * Фича для обработки callback query (нажатий на inline кнопки)
 */
export class CallbackQueryFeature extends IBaseBotFeature {
    public readonly name = 'CallbackQueryFeature';
    public readonly priority = 8;

    private bot?: IBot;

    /**
     * Инициализация фичи
     */
    public init(bot: IBot): void {
        this.bot = bot;

        // Обрабатываем нажатия на callback кнопки
        bot.on('callback_query:data', this.handleCallbackQuery.bind(this));

        logger.info('CallbackQueryFeature initialized');
    }

    /**
     * Обрабатывает нажатие на callback кнопку
     */
    private async handleCallbackQuery(ctx: IBotContext): Promise<void> {
        try {
            const data = ctx.callbackQuery?.data;

            if (!data || !data.startsWith('load:')) {
                return;
            }

            const videoId = data.replace('load:', '');

            logger.info('Запрос на загрузку видео по ID:', {
                userId: ctx.from?.id,
                videoId,
            });

            // Получаем URL из хранилища
            const url = videoIdStorage.get(videoId);

            if (!url) {
                logger.error('URL не найден для videoId:', { videoId });

                await ctx.answerCallbackQuery({
                    text: t('callback.error.alert'),
                    show_alert: true,
                });

                try {
                    await ctx.editMessageCaption({
                        caption: t('callback.error.caption', { error: 'Видео не найдено или истекло время' }),
                        parse_mode: 'Markdown',
                    });
                } catch {
                    // Игнорируем ошибку
                }

                return;
            }

            // Запрашиваем видео у Go сервиса по URL
            const result = await youtubeVideoService.getVideo(url, videoId);

            logger.info('Результат от Go сервиса:', { videoId, result });

            if (result.processing) {
                // Видео еще обрабатывается
                const inlineMessageId = ctx.callbackQuery?.inline_message_id;

                if (!inlineMessageId) {
                    logger.error('Отсутствует inlineMessageId для inline сообщения');
                    await ctx.answerCallbackQuery({
                        text: t('callback.inlineOnly'),
                        show_alert: true,
                    });
                    return;
                }

                logger.info('Видео в обработке, регистрация подписки:', {
                    videoId,
                    inlineMessageId,
                    hasBot: !!this.bot,
                    hasRedis: !!this.bot?.redisSubscriber,
                });

                await ctx.answerCallbackQuery({
                    text: t('callback.processing'),
                    show_alert: false,
                });

                // Обновляем caption, кнопка остается для повторных попыток
                try {
                    // Воссоздаем клавиатуру с той же кнопкой
                    const keyboard = new InlineKeyboard().text(t('inline.youtubeReady.button'), `load:${videoId}`);

                    await ctx.api.editMessageCaptionInline(inlineMessageId, {
                        caption: t('callback.processingCaption'),
                        parse_mode: 'Markdown',
                        reply_markup: keyboard, // Явно указываем кнопку, чтобы она не удалялась
                    });

                    // Подписываемся на событие из Redis
                    if (this.bot?.redisSubscriber) {
                        this.bot.redisSubscriber.subscribe(videoId, inlineMessageId);
                        logger.info('Подписка на автообновление зарегистрирована:', {
                            videoId,
                            inlineMessageId,
                        });
                    }
                } catch (error) {
                    logger.error('Ошибка обновления caption:', error);
                }

                return;
            }

            if (result.success && result.video_url) {
                // Видео готово - заменяем постер на видео
                try {
                    const caption =
                        t('callback.successCaption') +
                        '\n\n' +
                        VideoFormatter.formatVideoCaption({
                            title: result.title,
                            author: result.author,
                            views: result.views,
                            duration: result.length,
                            platform: 'youtube',
                        });

                    await ctx.editMessageMedia({
                        type: 'video',
                        media: result.video_url,
                        caption,
                        parse_mode: 'Markdown',
                    });

                    await ctx.answerCallbackQuery(t('callback.success'));

                    return;
                } catch (error) {
                    logger.error('Ошибка при замене медиа:', error);
                    await ctx.answerCallbackQuery(t('callback.error.alert'));

                    return;
                }
            }

            // Если success=true, но video_url отсутствует
            if (result.success && !result.video_url) {
                logger.warn('Видео обработано, но video_url отсутствует:', { videoId, result });

                await ctx.answerCallbackQuery({
                    text: t('callback.noVideoUrl.alert'),
                    show_alert: true,
                });

                try {
                    await ctx.editMessageCaption({
                        caption: t('callback.noVideoUrl.caption'),
                        parse_mode: 'Markdown',
                    });
                } catch {
                    // Игнорируем ошибку
                }

                return;
            }

            // Ошибка или видео не найдено
            await ctx.answerCallbackQuery({
                text: result.error || t('callback.error.alert'),
                show_alert: true,
            });

            try {
                await ctx.editMessageCaption({
                    caption: t('callback.error.caption', { error: result.error || t('callback.error.unknown') }),
                    parse_mode: 'Markdown',
                });
            } catch {
                // Игнорируем ошибку
            }
        } catch (error) {
            logger.error('Ошибка при обработке callback query:', error);

            try {
                await ctx.answerCallbackQuery(t('callback.error.general'));
            } catch {
                // Игнорируем ошибку если не удалось ответить
            }
        }
    }
}
