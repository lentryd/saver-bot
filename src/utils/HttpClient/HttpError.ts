/**
 * Ошибка HTTP-запроса
 */
export class HttpError extends Error {
    /**
     * Конструктор HTTP-ошибки
     */
    public constructor(
        message: string,
        public status: number,
        public statusText: string,
        public response?: Response
    ) {
        super(message);
        this.name = 'HttpError';
    }
}
