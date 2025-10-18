# Используем multi-stage build
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Копируем go mod файлы
COPY go.mod ./

# Загружаем зависимости
RUN go mod download

# Копируем весь код
COPY . .

# Обновляем зависимости и go.sum
RUN go mod tidy

# Собираем приложение
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o youtube-service ./cmd/server

# Финальный образ
FROM alpine:latest

# Устанавливаем yt-dlp и зависимости
RUN apk --no-cache add python3 py3-pip ffmpeg curl && \
  pip3 install --no-cache-dir --break-system-packages yt-dlp

WORKDIR /app

# Копируем собранное приложение
COPY --from=builder /app/youtube-service .

# Открываем порт
EXPOSE 5001

# Запускаем приложение
CMD ["./youtube-service"]
