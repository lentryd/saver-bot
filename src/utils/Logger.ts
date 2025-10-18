import { config } from '@/config';

/**
 * Уровни логирования
 */
export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3,
}

/**
 * Простой логгер для консоли
 */
class Logger {
    private level: LogLevel;

    /**
     * Конструктор логгера
     */
    public constructor() {
        this.level = Logger.getLogLevel();
    }

    /**
     * Определяет уровень логирования из конфигурации
     */
    private static getLogLevel(): LogLevel {
        switch (config.LOG_LEVEL.toLowerCase()) {
            case 'error':
                return LogLevel.ERROR;
            case 'warn':
                return LogLevel.WARN;
            case 'info':
                return LogLevel.INFO;
            case 'debug':
                return LogLevel.DEBUG;
            default:
                return LogLevel.INFO;
        }
    }

    /**
     * Форматирует сообщение с временной меткой
     */
    private static formatMessage(level: string, message: string, ...args: unknown[]): string {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0 ? ' ' + args.map((arg) => JSON.stringify(arg)).join(' ') : '';

        return `[${timestamp}] ${level}: ${message}${formattedArgs}`;
    }

    /**
     * Логирует сообщение об ошибке
     */
    public error(message: string, ...args: unknown[]): void {
        if (this.level >= LogLevel.ERROR) {
            console.error(Logger.formatMessage('ERROR', message, ...args));
        }
    }

    /**
     * Логирует предупреждение
     */
    public warn(message: string, ...args: unknown[]): void {
        if (this.level >= LogLevel.WARN) {
            console.warn(Logger.formatMessage('WARN', message, ...args));
        }
    }

    /**
     * Логирует информационное сообщение
     */
    public info(message: string, ...args: unknown[]): void {
        if (this.level >= LogLevel.INFO) {
            console.info(Logger.formatMessage('INFO', message, ...args));
        }
    }

    /**
     * Логирует отладочное сообщение
     */
    public debug(message: string, ...args: unknown[]): void {
        if (this.level >= LogLevel.DEBUG) {
            console.debug(Logger.formatMessage('DEBUG', message, ...args));
        }
    }
}

export const logger = new Logger();
