import { Database } from 'bun:sqlite';

import { config } from '@/config';
import { logger } from '@/utils/Logger';

interface IVideoIdMapping {
    videoId: string;
    url: string;
    createdAt: number;
}

/**
 * Хранилище для маппинга videoId -> URL в SQLite
 */
class VideoIdStorage {
    private db: Database;
    private readonly TTL = 30 * 60 * 1000; // 30 минут

    public constructor() {
        this.db = new Database(config.DATABASE_PATH);
        this.init();
    }

    /**
     * Инициализация таблицы
     */
    private init(): void {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS video_id_mappings (
                video_id TEXT PRIMARY KEY,
                url TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
        `);

        // Создаем индекс для быстрого поиска по времени
        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_video_id_created_at ON video_id_mappings(created_at)
        `);

        logger.info('VideoIdStorage initialized');
    }

    /**
     * Сохраняет маппинг videoId -> URL
     */
    public set(videoId: string, url: string): void {
        try {
            this.db.run(
                `
                INSERT OR REPLACE INTO video_id_mappings (video_id, url, created_at)
                VALUES (?, ?, ?)
            `,
                [videoId, url, Date.now()]
            );

            logger.debug('VideoId сохранен:', { videoId, url });
        } catch (error) {
            logger.error('Ошибка при сохранении videoId:', error);
        }
    }

    /**
     * Получает URL по videoId
     */
    public get(videoId: string): string | null {
        try {
            const result = this.db
                .query<IVideoIdMapping, [string]>(
                    `
                SELECT video_id as videoId, url, created_at as createdAt
                FROM video_id_mappings 
                WHERE video_id = ?
            `
                )
                .get(videoId);

            if (!result) {
                return null;
            }

            // Проверяем TTL
            if (Date.now() - result.createdAt > this.TTL) {
                this.delete(videoId);
                logger.debug('VideoId истек:', { videoId });

                return null;
            }

            return result.url;
        } catch (error) {
            logger.error('Ошибка при получении videoId:', error);

            return null;
        }
    }

    /**
     * Удаляет маппинг по videoId
     */
    public delete(videoId: string): void {
        try {
            this.db.run('DELETE FROM video_id_mappings WHERE video_id = ?', [videoId]);
            logger.debug('VideoId удален:', { videoId });
        } catch (error) {
            logger.error('Ошибка при удалении videoId:', error);
        }
    }

    /**
     * Очищает устаревшие записи
     */
    public cleanup(): void {
        try {
            const threshold = Date.now() - this.TTL;
            const result = this.db.run('DELETE FROM video_id_mappings WHERE created_at < ?', [threshold]);

            if (result.changes > 0) {
                logger.info('Очищены устаревшие videoId:', { deleted: result.changes });
            }
        } catch (error) {
            logger.error('Ошибка при очистке videoId:', error);
        }
    }

    /**
     * Получает количество сохраненных маппингов
     */
    public size(): number {
        try {
            const result = this.db
                .query<{ count: number }, []>('SELECT COUNT(*) as count FROM video_id_mappings')
                .get();

            return result?.count || 0;
        } catch (error) {
            logger.error('Ошибка при получении размера хранилища:', error);

            return 0;
        }
    }
}

// Экспортируем singleton
export const videoIdStorage = new VideoIdStorage();

// Запускаем периодическую очистку каждые 5 минут
setInterval(
    () => {
        videoIdStorage.cleanup();
    },
    5 * 60 * 1000
);
