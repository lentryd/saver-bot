import i18next from 'i18next';
import path from 'path';

import { config } from '@/config';
import { MarkdownEscaper } from '@/utils/MarkdownEscaper';

/**
 * Поддерживаемые локали (только русский)
 */
export type SupportedLocale = 'ru';

/**
 * Инициализация i18next (только русский язык)
 */
export async function initI18n(): Promise<void> {
    const Backend = (await import('i18next-fs-backend')).default;
    await i18next.use(Backend).init({
        lng: 'ru', // единственный поддерживаемый язык
        fallbackLng: 'ru',
        debug: config.NODE_ENV === 'development',

        backend: {
            loadPath: path.join(process.cwd(), 'locales', '{{lng}}', '{{ns}}.json'),
        },

        interpolation: {
            escapeValue: false, // не экранируем HTML (безопасно для Telegram)
        },
        returnObjects: true, // поддержка объектов в переводах

        saveMissing: false, // отключаем сохранение недостающих ключей
    });
}

/**
 * Устанавливает язык
 */
export async function setLanguage(lng: SupportedLocale): Promise<void> {
    await i18next.changeLanguage(lng);
}

/**
 * Получает текущий язык
 */
export function getCurrentLanguage(): string {
    return i18next.language;
}

/**
 * Основная функция перевода с автоматическим экранированием параметров
 */
export function t(key: string, options?: any): string {
    // Экранируем параметры перед передачей в i18next
    const escapedOptions = options ? { ...options, ...MarkdownEscaper.escapeParams(options) } : options;

    return i18next.t(key, escapedOptions) as string;
}

/**
 * Перевод с определенным языком и автоматическим экранированием параметров
 */
export function tWithLanguage(key: string, lng: SupportedLocale, options?: any): string {
    // Экранируем параметры перед передачей в i18next
    const escapedOptions = MarkdownEscaper.escapeParams(options);

    return i18next.t(key, { ...escapedOptions, lng }) as string;
}

/**
 * Проверяет, существует ли ключ перевода
 */
export function exists(key: string, lng?: SupportedLocale): boolean {
    return i18next.exists(key, { lng });
}

/**
 * Получает список доступных языков
 */
export function getAvailableLanguages(): readonly string[] {
    return i18next.languages;
}

/**
 * Экспортируем MarkdownEscaper для явного использования
 */
export { MarkdownEscaper } from '@/utils/MarkdownEscaper';
