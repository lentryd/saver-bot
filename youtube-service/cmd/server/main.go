package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/wader/goutubedl"
	"github.com/wader/goutubedl/internal/cache"
	"github.com/wader/goutubedl/internal/downloader"
	"github.com/wader/goutubedl/internal/handlers"
	"github.com/wader/goutubedl/internal/redis"
)

func main() {
	// Используем yt-dlp
	goutubedl.Path = "yt-dlp"

	// Создаём компоненты
	videoCache := cache.New()
	videoDownloader := downloader.New()

	// Инициализируем Redis publisher (опционально)
	var publisher *redis.Publisher
	redisURL := os.Getenv("REDIS_URL")
	if redisURL != "" {
		var err error
		publisher, err = redis.NewPublisher(redisURL)
		if err != nil {
			log.Printf("⚠️ Не удалось подключиться к Redis: %v. Продолжаем без pub/sub.", err)
		} else {
			defer publisher.Close()
		}
	} else {
		log.Println("⚠️ REDIS_URL не задан. Pub/Sub события отключены.")
	}

	videoHandler := handlers.NewVideoHandler(videoCache, videoDownloader, publisher)

	// Запускаем периодическую очистку кеша (каждые 10 минут)
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			log.Println("Очистка старых записей в кеше...")
			videoCache.Cleanup(30 * time.Minute) // TTL: 30 минут
		}
	}()

	// Настраиваем роуты
	http.HandleFunc("/health", handlers.HealthHandler)
	http.HandleFunc("/video_info", videoHandler.Handle)

	// Получаем порт
	port := os.Getenv("YOUTUBE_SERVICE_PORT")
	if port == "" {
		port = "5001"
	}

	// Запускаем сервер
	log.Printf("🚀 Сервер запущен на порту %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}
