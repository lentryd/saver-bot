/**
 * Утилита для форматирования информации о видео
 */
export class VideoFormatter {
    /**
     * Максимальная длина подписи к медиа в Telegram (1024 символа).
     * Берём с запасом, чтобы Markdown-разметка не выходила за лимит.
     */
    private static readonly MAX_CAPTION_LENGTH = 1024;

    /**
     * Форматирует подпись для видео (унифицированный формат для всех платформ)
     */
    public static formatVideoCaption(video: {
        title?: string;
        author?: string;
        views?: number;
        duration?: number;
        platform?: 'tiktok' | 'youtube';
    }): string {
        const parts: string[] = [];

        // Автор
        const tailParts: string[] = [];

        if (video.author) {
            tailParts.push(`👤 ${video.author}`);
        }

        // Статистика
        const stats: string[] = [];

        if (video.views !== undefined && video.views > 0) {
            stats.push(`👁 ${this.formatNumber(video.views)}`);
        }

        if (video.duration !== undefined && video.duration > 0) {
            stats.push(`⏱ ${this.formatDuration(video.duration)}`);
        }

        if (stats.length > 0) {
            tailParts.push('');
            tailParts.push(stats.join(' • '));
        }

        // Хвост (автор + статистика) показываем целиком, заголовок усекаем под лимит
        const tail = tailParts.join('\n');

        // Заголовок
        if (video.title) {
            // Резервируем место под хвост и переносы строк между блоками
            const reserved = tail.length > 0 ? tail.length + 1 : 0;
            const available = this.MAX_CAPTION_LENGTH - reserved - '📹 '.length;
            const title = this.truncate(video.title, available);

            parts.push(`📹 ${title}`);
        }

        if (tail.length > 0) {
            parts.push(tail);
        }

        return parts.join('\n');
    }

    /**
     * Усекает текст до заданной длины, добавляя многоточие
     */
    private static truncate(text: string, maxLength: number): string {
        if (maxLength <= 0) {
            return '';
        }

        if (text.length <= maxLength) {
            return text;
        }

        if (maxLength <= 1) {
            return text.slice(0, maxLength);
        }

        return `${text.slice(0, maxLength - 1).trimEnd()}…`;
    }

    /**
     * Форматирует число с разделителями тысяч
     */
    public static formatNumber(num: number): string {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        }

        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        }

        return num.toString();
    }

    /**
     * Форматирует длительность видео
     */
    public static formatDuration(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);

        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}
