/**
 * Утилита для экранирования специальных символов Markdown в Telegram
 */
export class MarkdownEscaper {
    /**
     * Символы, которые нужно экранировать в Markdown
     * To escape characters '_', '*', '`', '[' outside of an entity, prepend the character '\' before them.
     */
    private static readonly SPECIAL_CHARS = ['_', '*', '`', '['];

    /**
     * Экранирует специальные символы Markdown
     * @param text - текст для экранирования
     * @returns экранированный текст
     */
    public static escape(text: string | number | undefined | null): string {
        if (text === undefined || text === null) {
            return '';
        }

        const str = String(text);
        let result = str;

        for (const char of this.SPECIAL_CHARS) {
            // Экранируем символ, только если он не уже экранирован
            result = result.replace(new RegExp(`(?<!\\\\)\\${char}`, 'g'), `\\${char}`);
        }

        return result;
    }

    /**
     * Экранирует объект с параметрами для интерполяции
     * @param params - объект с параметрами
     * @returns объект с экранированными значениями
     */
    public static escapeParams(params?: Record<string, any>): Record<string, any> | undefined {
        if (!params) {
            return undefined;
        }

        const escaped: Record<string, any> = {};

        for (const [key, value] of Object.entries(params)) {
            if (typeof value === 'string' || typeof value === 'number') {
                escaped[key] = this.escape(value);
            } else {
                escaped[key] = value;
            }
        }

        return escaped;
    }
}
