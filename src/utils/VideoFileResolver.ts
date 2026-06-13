import type { Api } from 'grammy';
import { InputFile } from 'grammy';

import { getStorageChatId } from '@/config';

import { logger } from './Logger';

/**
 * Превращает прямой URL видео в Telegram file_id.
 *
 * Telegram не умеет скачивать прямые googlevideo/tiktok URL для inline-сообщений
 * (URL привязаны к IP/клиенту). Поэтому видео сначала заливается в служебный
 * канал через multipart-загрузку (grammy сам качает байты с нашего IP), а из
 * полученного сообщения берётся file_id, который уже можно отдавать в inline.
 */
export class VideoFileResolver {
    /**
     * Получает file_id для видео, заливая его в служебный чат.
     *
     * @param api - Telegram API
     * @param videoUrl - прямой URL видео
     * @returns file_id или null, если служебный чат не настроен либо заливка не удалась
     */
    public static async resolveFileId(api: Api, videoUrl: string): Promise<string | null> {
        const storageChatId = getStorageChatId();

        if (storageChatId === undefined) {
            logger.warn('STORAGE_CHAT_ID не задан — невозможно получить file_id для inline-видео');
            return null;
        }

        try {
            const message = await api.sendVideo(storageChatId, new InputFile(new URL(videoUrl)), {
                disable_notification: true,
            });

            const fileId = message.video?.file_id;

            if (!fileId) {
                logger.error('Служебная заливка видео не вернула file_id', { storageChatId });
                return null;
            }

            return fileId;
        } catch (error) {
            logger.error('Ошибка заливки видео в служебный чат:', {
                error: error instanceof Error ? error.message : String(error),
                storageChatId,
            });

            return null;
        }
    }
}
