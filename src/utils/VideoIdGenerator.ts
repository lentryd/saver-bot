import crypto from 'crypto';

/**
 * Генератор коротких ID для видео
 */
export class VideoIdGenerator {
    /**
     * Генерирует короткий ID из URL (MD5 hash, первые 8 символов)
     * @param url - URL видео
     * @returns короткий ID (8 символов)
     */
    public static generate(url: string): string {
        const hash = crypto.createHash('md5').update(url).digest('hex');

        return hash.substring(0, 8);
    }
}
