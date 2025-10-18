/**
 * Тип платформы видео
 */
export type VideoPlatform = 'tiktok' | 'youtube';

/**
 * Информация о видео TikTok или YouTube Shorts
 */
export interface ITikTokVideo {
    /**
     * ID видео
     */
    id: string;

    /**
     * Платформа видео
     */
    platform: VideoPlatform;

    /**
     * Описание видео
     */
    description: string;

    /**
     * Имя автора
     */
    author: string;

    /**
     * Никнейм автора
     */
    authorUsername: string;

    /**
     * URL оригинального видео
     */
    url: string;

    /**
     * URL видео без водяного знака (если доступно)
     */
    videoUrl?: string;

    /**
     * URL обложки видео
     */
    coverUrl?: string;

    /**
     * Длительность видео в секундах
     */
    duration?: number;

    /**
     * Количество лайков
     */
    likes?: number;

    /**
     * Количество комментариев
     */
    comments?: number;

    /**
     * Количество репостов
     */
    shares?: number;

    /**
     * Количество просмотров
     */
    views?: number;

    /**
     * Музыка в видео (только для TikTok)
     */
    music?: {
        title: string;
        author: string;
        url?: string;
    };
}

/**
 * Результат загрузки видео
 */
export interface ITikTokDownloadResult {
    /**
     * Успешность загрузки
     */
    success: boolean;

    /**
     * Информация о видео
     */
    video?: ITikTokVideo;

    /**
     * Сообщение об ошибке
     */
    error?: string;
}
