/**
 * Конфигурация приложения
 */
export const config = {
    // Основные настройки бота
    NODE_ENV: process.env.NODE_ENV || 'development',
    BOT_TOKEN: process.env.BOT_TOKEN || '',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',

    // Webhook и сервер настройки
    USE_WEBHOOK: process.env.USE_WEBHOOK === 'true',
    WEBHOOK_URL: process.env.WEBHOOK_URL || '',
    PORT: parseInt(process.env.PORT || '3000', 10),

    // Администраторы бота
    ADMINS: process.env.ADMINS || '',
    ADMIN_IDS: process.env.ADMIN_IDS || '', // Для совместимости

    // Дополнительные настройки
    DATABASE_PATH: process.env.DATABASE_PATH || 'data/sessions.db',
    HTTP_TIMEOUT: parseInt(process.env.HTTP_TIMEOUT || '30000', 10),
    MAX_RETRY_ATTEMPTS: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10),

    // YouTube Service
    YOUTUBE_SERVICE_URL: process.env.YOUTUBE_SERVICE_URL || 'http://localhost:5001',
} as const;

/**
 * Получение списка ID администраторов из конфигурации
 */
export function getAdminIds(): number[] {
    // Сначала пробуем ADMINS, потом ADMIN_IDS для совместимости
    const adminString = config.ADMINS || config.ADMIN_IDS;

    if (!adminString) {
        return [];
    }

    return adminString
        .split(',')
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id));
}

/**
 * Валидация конфигурации
 */
export function validateConfig(): void {
    if (!config.BOT_TOKEN) {
        throw new Error('BOT_TOKEN не установлен в переменных окружения');
    }

    if (config.USE_WEBHOOK && !config.WEBHOOK_URL) {
        throw new Error('WEBHOOK_URL обязателен когда USE_WEBHOOK=true');
    }
}

// Валидируем конфигурацию при импорте
validateConfig();
