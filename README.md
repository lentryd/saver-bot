# 🎬 TikTok & YouTube Shorts Video Downloader Bot

Telegram бот для скачивания видео с TikTok и YouTube Shorts. Работает в **inline режиме** - просто вставьте ссылку на видео в любой чат и выберите бота.

## ✨ Возможности

- 📥 Скачивание видео с TikTok без водяных знаков (когда доступно)
- � Скачивание видео с YouTube Shorts
- �🔍 Работа в inline режиме - используйте бота в любом чате
- 📊 Показ информации о видео (автор, описание, статистика)
- 🎵 Информация о музыке в TikTok видео
- ⚡ Быстрая обработка запросов

## 🚀 Использование

### Для пользователей

1. Найдите бота в Telegram по имени
2. Скопируйте ссылку на видео TikTok или YouTube Shorts
3. В любом чате начните вводить имя бота и вставьте ссылку
4. Выберите результат из списка
5. Видео будет отправлено в чат!

**Поддерживаемые форматы ссылок:**

**TikTok:**
- `https://www.tiktok.com/@username/video/1234567890`
- `https://vm.tiktok.com/abc123`
- `https://vt.tiktok.com/abc123`
- `https://m.tiktok.com/@username/video/1234567890`

**YouTube Shorts:**
- `https://www.youtube.com/shorts/abc123`
- `https://youtube.com/shorts/abc123`
- `https://youtu.be/abc123`

### Для разработчиков

## 📦 Установка

```bash
# Установить зависимости
bun install
```

## ⚙️ Конфигурация

Создайте файл `.env` в корне проекта:

```env
# Токен бота от @BotFather
BOT_TOKEN=your_bot_token_here

# URL YouTube сервиса (необходим для скачивания YouTube Shorts)
YOUTUBE_SERVICE_URL=http://localhost:5000

# Уровень логирования (debug, info, warn, error)
LOG_LEVEL=info

# Настройки окружения
NODE_ENV=production
```

## 🏃 Запуск

### 1. YouTube Service (обязательно для YouTube Shorts)

YouTube сервис необходим для получения прямых ссылок на видео YouTube Shorts.

```bash
# Убедитесь, что Docker запущен
docker --version

# Соберите и запустите сервис
docker-compose up -d --build

# Проверьте статус
curl http://localhost:5000/health
# Ответ: {"status": "ok"}

# Просмотр логов
docker-compose logs -f youtube-service

# Остановка сервиса
docker-compose down
```

**Примечание:** Если YouTube сервис не запущен, бот все равно будет работать, но для YouTube Shorts будет отправляться только ссылка на видео (без прямого скачивания).

### 2. Telegram Bot

```bash
# Development режим с hot reload
bun run dev

# Production режим
bun run start

# Проверка типов
bun run type-check

# Линтинг кода
bun run lint

# Форматирование кода
bun run format
```

## 🏗️ Архитектура проекта

Проект следует модульной архитектуре с четким разделением ответственности:

```plaintext
src/
├── config/           # Конфигурация приложения
├── features/         # Модульные фичи бота
│   └── InlineQueryFeature/   # Обработка inline запросов
├── types/            # TypeScript типы
├── utils/            # Утилиты и хелперы
│   ├── HttpClient/   # HTTP клиент для API запросов
│   ├── TikTokDownloader.ts   # Логика скачивания с TikTok
│   ├── Logger.ts     # Система логирования
│   └── ...
└── index.ts          # Точка входа
```

### Основные компоненты

- **Features** - Модульные фичи с базовым классом `IBaseBotFeature`
- **FeatureManager** - Централизованное управление фичами
- **TikTokDownloader** - Класс для работы с TikTok API
- **HttpClient** - Обертка для HTTP запросов с обработкой ошибок

## 🛠️ Технологии

- **Runtime:** [Bun](https://bun.sh) - быстрый JavaScript runtime
- **Bot Framework:** [Grammy](https://grammy.dev) - современный фреймворк для Telegram ботов
- **Language:** TypeScript
- **Code Quality:** ESLint + Prettier
- **Localization:** i18next

## 📝 Структура фичи

Каждая фича наследуется от базового класса и имеет единую структуру:

```typescript
export class MyFeature extends IBaseBotFeature {
    public readonly name = 'MyFeature';
    public readonly priority = 10;

    public init(bot: IBot): void {
        // Регистрация обработчиков
    }
}
```

## 🔧 Добавление новых фичей

1. Создайте новую папку в `src/features/`
2. Создайте класс, наследующий `IBaseBotFeature`
3. Зарегистрируйте фичу в `src/features/index.ts`

## 📄 Лицензия

MIT

## 🤝 Вклад

Приветствуются pull requests! Для крупных изменений сначала откройте issue для обсуждения.

---

Made with ❤️ using [Bun](https://bun.sh) and [Grammy](https://grammy.dev)
