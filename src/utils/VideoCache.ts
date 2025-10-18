import { Database } from 'bun:sqlite';

import { config } from '@/config';
import { logger } from '@/utils/Logger';

/**
 * Интерфейс для закешированного видео
 */
interface ICachedVideo {
    url: string;
    videoUrl: string;
    title: string;
    author: string;
    thumbnail: string;
    duration: number;
    views: number;
    cachedAt: number;
}

/**
 * Хранилище для кеширования видео
 */
class VideoCache {
    private db: Database;

    public constructor() {
        this.db = new Database(config.DATABASE_PATH);
        this.init();
    }

    /**
     * Инициализация таблицы
     */
    private init(): void {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS video_cache (
                url TEXT PRIMARY KEY,
                video_url TEXT NOT NULL,
                title TEXT,
                author TEXT,
                thumbnail TEXT,
                duration INTEGER,
                views INTEGER,
                cached_at INTEGER NOT NULL
            )
        `);

        // Создаем индекс для быстрого поиска
        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_cached_at ON video_cache(cached_at)
        `);

        logger.info('Video cache initialized');
    }

    /**
     * Получить закешированное видео
     */
    public get(url: string): ICachedVideo | null {
        try {
            const result = this.db
                .query(
                    `
                SELECT 
                    url,
                    video_url as videoUrl,
                    title,
                    author,
                    thumbnail,
                    duration,
                    views,
                    cached_at as cachedAt
                FROM video_cache 
                WHERE url = ?
            `
                )
                .get(url) as ICachedVideo | null;

            if (result) {
                logger.info('Video found in cache:', { url });
            }

            return result;
        } catch (error) {
            logger.error('Error getting video from cache:', error);

            return null;
        }
    }

    /**
     * Сохранить видео в кеш
     */
    public set(data: {
        url: string;
        videoUrl: string;
        title?: string;
        author?: string;
        thumbnail?: string;
        duration?: number;
        views?: number;
    }): void {
        try {
            this.db.run(
                `
                INSERT OR REPLACE INTO video_cache (
                    url, video_url, title, author, thumbnail, duration, views, cached_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
                [
                    data.url,
                    data.videoUrl,
                    data.title || null,
                    data.author || null,
                    data.thumbnail || null,
                    data.duration || null,
                    data.views || null,
                    Date.now(),
                ]
            );

            logger.info('Video saved to cache:', { url: data.url });
        } catch (error) {
            logger.error('Error saving video to cache:', error);
        }
    }

    /**
     * Очистить устаревшие записи (старше 30 дней)
     */
    public cleanup(): void {
        try {
            const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

            const result = this.db.run(
                `
                DELETE FROM video_cache 
                WHERE cached_at < ?
            `,
                [thirtyDaysAgo]
            );

            if (result.changes > 0) {
                logger.info('Cleaned up old cache entries:', { count: result.changes });
            }
        } catch (error) {
            logger.error('Error cleaning up cache:', error);
        }
    }

    /**
     * Получить статистику кеша
     */
    public getStats(): { total: number; oldestEntry: number; newestEntry: number } {
        try {
            const result = this.db
                .query(
                    `
                SELECT 
                    COUNT(*) as total,
                    MIN(cached_at) as oldest,
                    MAX(cached_at) as newest
                FROM video_cache
            `
                )
                .get() as { total: number; oldest: number; newest: number };

            return {
                newestEntry: result.newest,
                oldestEntry: result.oldest,
                total: result.total,
            };
        } catch (error) {
            logger.error('Error getting cache stats:', error);

            return { newestEntry: 0, oldestEntry: 0, total: 0 };
        }
    }

    /**
     * Закрыть соединение с базой данных
     */
    public close(): void {
        this.db.close();
    }
}

// Singleton instance
export const videoCache = new VideoCache();

// Запускаем очистку каждые 24 часа
setInterval(
    () => {
        videoCache.cleanup();
    },
    24 * 60 * 60 * 1000
);
