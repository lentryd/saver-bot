import type { IBot } from '@/types/Bot';
import type { IBotContext } from '@/types/BotContext';
import { IBaseBotFeature } from '@/types/Feature';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/Logger';

/**
 * Фича для обработки команды /start
 */
export class StartFeature extends IBaseBotFeature {
    public readonly name = 'StartFeature';
    public readonly priority = 5;

    /**
     * Инициализация фичи
     */
    public init(bot: IBot): void {
        // Обработчик команды /start
        bot.command('start', async (ctx) => {
            await this.handleStart(ctx);
        });

        logger.info('StartFeature initialized');
    }

    /**
     * Обрабатывает команду /start
     */
    private async handleStart(ctx: IBotContext): Promise<void> {
        try {
            const firstName = ctx.from?.first_name || 'друг';
            const username = ctx.me.username;

            const message = [
                t('start.greeting', { name: firstName }),
                '',
                t('start.title'),
                '',
                t('start.howToUse'),
                '',
                t('start.inlineMode'),
                t('start.step1', { username }),
                t('start.step2'),
                t('start.step3'),
                t('start.step4'),
                '',
                t('start.supportedPlatforms'),
                t('start.tiktok'),
                t('start.youtube'),
                '',
                t('start.features'),
                t('start.feature1'),
                t('start.feature2'),
                t('start.feature3'),
                '',
                t('start.examples'),
                t('start.exampleTiktok'),
                t('start.exampleTiktokShort'),
                t('start.exampleYoutube'),
                '',
                t('start.tryNow'),
                t('start.tryExample', { username }),
            ].join('\n');

            await ctx.reply(message, {
                parse_mode: 'Markdown',
            });

            logger.info('Start command processed:', { userId: ctx.from?.id });
        } catch (error) {
            logger.error('Ошибка при обработке команды /start:', error);

            await ctx.reply(t('start.error'));
        }
    }
}
