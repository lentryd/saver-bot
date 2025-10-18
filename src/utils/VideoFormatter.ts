/**
 * Утилита для форматирования информации о видео
 */
export class VideoFormatter {
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

        // Заголовок
        if (video.title) {
            parts.push(`📹 ${video.title}`);
        }

        // Автор
        if (video.author) {
            parts.push(`👤 ${video.author}`);
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
            parts.push('');
            parts.push(stats.join(' • '));
        }

        return parts.join('\n');
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
