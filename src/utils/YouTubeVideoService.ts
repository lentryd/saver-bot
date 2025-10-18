import { config } from '@/config';
import { HttpClient } from '@/utils/HttpClient';
import { logger } from '@/utils/Logger';

interface IGetVideoResponse {
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
}

/**
 * Сервис для работы с YouTube видео через Go сервис
 */
class YouTubeVideoService {
    private httpClient: HttpClient;

    public constructor() {
        this.httpClient = new HttpClient(undefined, undefined, config.HTTP_TIMEOUT);
    }

    /**
     * Получает информацию о видео по URL
     */
    public async getVideo(url: string, videoId?: string): Promise<IGetVideoResponse> {
        try {
            const response = await this.httpClient.post<IGetVideoResponse>(
                `${config.YOUTUBE_SERVICE_URL}/video_info`,
                { url, video_id: videoId },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Ошибка при получении видео:', error);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}

// Экспортируем singleton
export const youtubeVideoService = new YouTubeVideoService();
