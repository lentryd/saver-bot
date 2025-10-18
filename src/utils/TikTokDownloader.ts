import { config } from '@/config';
import type { ITikTokDownloadResult, ITikTokVideo } from '@/types/TikTok';
import { HttpClient } from '@/utils/HttpClient';
import { logger } from '@/utils/Logger';
import { videoCache } from '@/utils/VideoCache';
import { VideoFormatter } from '@/utils/VideoFormatter';

/**
 * Класс для работы с TikTok и YouTube Shorts API и скачивания видео
 */
export class TikTokDownloader {
    private httpClient: HttpClient;

    /**
     * Конструктор
     */
    public constructor() {
        this.httpClient = new HttpClient(undefined, undefined, config.HTTP_TIMEOUT);
    }

    /**
     * Проверяет, является ли строка валидной ссылкой на TikTok
     */
    public static isValidTikTokUrl(url: string): boolean {
        const tiktokRegex =
            /^https?:\/\/(www\.)?(vm\.tiktok\.com|vt\.tiktok\.com|tiktok\.com|m\.tiktok\.com)\/([\w-]+\/video\/\d+|@[\w.-]+\/video\/\d+|[\w-]+)\/?(\?.*)?$/i;

        return tiktokRegex.test(url);
    }

    /**
     * Проверяет, является ли строка валидной ссылкой на YouTube Shorts
     */
    public static isValidYouTubeUrl(url: string): boolean {
        const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com\/shorts\/|youtu\.be\/)[\w-]+(\?.*)?$/i;

        return youtubeRegex.test(url);
    }

    /**
     * Проверяет, является ли строка валидной ссылкой на поддерживаемую платформу
     */
    public static isValidUrl(url: string): boolean {
        return this.isValidTikTokUrl(url) || this.isValidYouTubeUrl(url);
    }

    /**
     * Определяет платформу по URL
     */
    public static detectPlatform(url: string): 'tiktok' | 'youtube' | null {
        if (this.isValidTikTokUrl(url)) {
            return 'tiktok';
        }

        if (this.isValidYouTubeUrl(url)) {
            return 'youtube';
        }

        return null;
    }

    /**
     * Извлекает ID видео из TikTok URL
     */
    private static extractVideoId(url: string): string | null {
        try {
            // Паттерны для различных форматов TikTok URL
            const patterns = [
                /video\/(\d+)/i,
                /v\/(\d+)/i,
                /tiktok\.com\/@[\w.-]+\/video\/(\d+)/i,
                /tiktok\.com\/[\w-]+\/video\/(\d+)/i,
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);

                if (match && match[1]) {
                    return match[1];
                }
            }

            return null;
        } catch (error) {
            logger.error('Ошибка при извлечении ID видео:', error);
            return null;
        }
    }

    /**
     * Загружает информацию о видео из TikTok или YouTube Shorts
     * Использует публичное API для получения данных
     */
    public async downloadVideo(url: string): Promise<ITikTokDownloadResult> {
        try {
            // Определяем платформу
            const platform = TikTokDownloader.detectPlatform(url);

            if (!platform) {
                return {
                    success: false,
                    error: 'Невалидная ссылка. Поддерживаются TikTok и YouTube Shorts',
                };
            }

            // Загружаем видео в зависимости от платформы
            if (platform === 'tiktok') {
                return await this.downloadTikTokVideo(url);
            } else {
                return await this.downloadYouTubeVideo(url);
            }
        } catch (error) {
            logger.error('Ошибка при загрузке видео:', error);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка при загрузке видео',
            };
        }
    }

    /**
     * Загружает информацию о видео из TikTok
     */
    private async downloadTikTokVideo(url: string): Promise<ITikTokDownloadResult> {
        try {
            logger.info('Загрузка видео TikTok:', { url });

            // Используем публичное API для получения информации о видео
            // Здесь используется TikTok API wrapper (можно использовать различные сервисы)
            const responseData = await this.httpClient.post<{
                code: number;
                msg?: string;
                data?: any;
            }>(
                'https://www.tikwm.com/api/',
                {
                    url,
                    hd: 1,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    },
                }
            );

            const response = responseData.data;

            // Проверяем успешность ответа
            if (response.code !== 0 || !response.data) {
                logger.error('Ошибка при загрузке видео TikTok:', response);

                return {
                    success: false,
                    error: response.msg || 'Не удалось загрузить видео',
                };
            }

            const data = response.data;

            // Формируем результат
            const video: ITikTokVideo = {
                id: data.id || TikTokDownloader.extractVideoId(url) || 'unknown',
                platform: 'tiktok',
                description: data.title || '',
                author: data.author?.nickname || 'Unknown',
                authorUsername: data.author?.unique_id || 'unknown',
                url,
                videoUrl: data.hdplay || data.play || data.wmplay,
                coverUrl: data.cover || data.origin_cover,
                duration: data.duration || 0,
                likes: data.digg_count || 0,
                comments: data.comment_count || 0,
                shares: data.share_count || 0,
                views: data.play_count || 0,
                music: data.music
                    ? {
                          title: data.music.title || '',
                          author: data.music.author || '',
                          url: data.music.play_url,
                      }
                    : undefined,
            };

            logger.info('Видео успешно загружено:', {
                id: video.id,
                author: video.authorUsername,
            });

            return {
                success: true,
                video,
            };
        } catch (error) {
            logger.error('Ошибка при загрузке видео TikTok:', error);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка при загрузке видео',
            };
        }
    }

    /**
     * Загружает информацию о видео из YouTube Shorts
     */
    private async downloadYouTubeVideo(url: string): Promise<ITikTokDownloadResult> {
        try {
            logger.info('Обработка видео YouTube Shorts:', { url });

            // Извлекаем ID видео из URL
            const videoIdMatch = url.match(/(?:shorts\/|youtu\.be\/)([a-zA-Z0-9_-]+)/);

            if (!videoIdMatch || !videoIdMatch[1]) {
                return {
                    success: false,
                    error: 'Не удалось извлечь ID видео из URL',
                };
            }

            const videoId = videoIdMatch[1];

            // Проверяем кеш
            const cached = videoCache.get(url);

            if (cached) {
                logger.info('Видео найдено в кеше:', { url });

                const video: ITikTokVideo = {
                    id: videoId,
                    platform: 'youtube',
                    description: cached.title || 'YouTube Shorts Video',
                    author: cached.author || 'YouTube Creator',
                    authorUsername: cached.author || 'youtube',
                    url,
                    videoUrl: cached.videoUrl,
                    coverUrl: cached.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    duration: cached.duration || 0,
                    likes: 0,
                    comments: 0,
                    shares: 0,
                    views: cached.views || 0,
                };

                return {
                    success: true,
                    video,
                };
            }

            // Пытаемся получить информацию через YouTube сервис
            try {
                const responseData = await this.httpClient.post<{
                    success: boolean;
                    processing?: boolean;
                    video_url?: string;
                    title?: string;
                    author?: string;
                    length?: number;
                    views?: number;
                    description?: string;
                    thumbnail?: string;
                    resolution?: string;
                    error?: string;
                }>(
                    `${config.YOUTUBE_SERVICE_URL}/video_info`,
                    {
                        url,
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );

                const response = responseData.data;

                // Проверяем, обрабатывается ли видео
                if (response.processing) {
                    logger.info('Видео обрабатывается на сервере:', { url });

                    return {
                        success: false,
                        error: 'processing',
                    };
                }

                // Проверяем успешность ответа
                if (response.success && response.video_url) {
                    const video: ITikTokVideo = {
                        id: videoId,
                        platform: 'youtube',
                        description: response.description || 'YouTube Shorts Video',
                        author: response.author || 'YouTube Creator',
                        authorUsername: response.author || 'youtube',
                        url,
                        videoUrl: response.video_url,
                        coverUrl: response.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                        duration: response.length || 0,
                        likes: 0,
                        comments: 0,
                        shares: 0,
                        views: response.views || 0,
                    };

                    // Сохраняем в кеш
                    videoCache.set({
                        url,
                        videoUrl: response.video_url,
                        title: response.title || response.description,
                        author: response.author,
                        thumbnail: response.thumbnail,
                        duration: response.length,
                        views: response.views,
                    });

                    logger.info('Информация о видео YouTube Shorts получена через сервис:', {
                        id: videoId,
                        author: video.author,
                    });

                    return {
                        success: true,
                        video,
                    };
                }

                logger.warn('YouTube сервис не вернул прямую ссылку:', response.error);
            } catch (error) {
                logger.warn('Ошибка при обращении к YouTube сервису:', error);
            }

            // Если YouTube сервис недоступен, возвращаем базовую информацию без прямой ссылки
            // Telegram не поддерживает отправку видео напрямую с YouTube через inline режим,
            // поэтому отправляем только информацию о видео со ссылкой
            const video: ITikTokVideo = {
                id: videoId,
                platform: 'youtube',
                description: 'YouTube Shorts Video',
                author: 'YouTube Creator',
                authorUsername: 'youtube',
                url,
                coverUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                duration: 0,
                likes: 0,
                comments: 0,
                shares: 0,
                views: 0,
            };

            logger.info('Информация о видео YouTube Shorts получена:', {
                id: video.id,
            });

            return {
                success: true,
                video,
            };
        } catch (error) {
            logger.error('Ошибка при обработке видео YouTube:', error);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка при обработке видео',
            };
        }
    }

    /**
     * Форматирует информацию о видео для отображения
     */
    public formatVideoInfo(video: ITikTokVideo): string {
        return VideoFormatter.formatVideoCaption({
            title: video.description || `Video by ${video.author}`,
            author: video.author,
            views: video.views,
            duration: video.duration,
            platform: video.platform,
        });
    }
}
