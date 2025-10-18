package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/wader/goutubedl/internal/cache"
	"github.com/wader/goutubedl/internal/downloader"
	"github.com/wader/goutubedl/internal/models"
	"github.com/wader/goutubedl/internal/redis"
	"github.com/wader/goutubedl/internal/validator"
)

// VideoHandler обрабатывает запросы на получение информации о видео
type VideoHandler struct {
	cache      *cache.Cache
	downloader *downloader.Downloader
	publisher  *redis.Publisher
}

// NewVideoHandler создаёт новый обработчик
func NewVideoHandler(c *cache.Cache, d *downloader.Downloader, p *redis.Publisher) *VideoHandler {
	return &VideoHandler{
		cache:      c,
		downloader: d,
		publisher:  p,
	}
}

// Handle обрабатывает запрос
func (h *VideoHandler) Handle(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(models.VideoInfoResponse{
			Success: false,
			Error:   "Method not allowed",
		})
		return
	}

	var req models.VideoInfoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.VideoInfoResponse{
			Success: false,
			Error:   "Invalid request body",
		})
		return
	}

	if req.URL == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.VideoInfoResponse{
			Success: false,
			Error:   "Missing url parameter",
		})
		return
	}

	// VideoID необязателен, но логируем если есть
	if req.VideoID != "" {
		log.Printf("Запрос на видео: %s (videoId: %s)", req.URL, req.VideoID)
	} else {
		log.Printf("Запрос на видео: %s", req.URL)
	}

	// Валидация URL
	if !validator.IsValidYouTubeURL(req.URL) {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.VideoInfoResponse{
			Success: false,
			Error:   "Invalid YouTube URL",
		})
		return
	}

	// Проверяем кеш
	cached, exists := h.cache.Get(req.URL)

	if exists {
		if cached.Processing {
			// Видео еще обрабатывается
			log.Printf("Видео обрабатывается: %s", req.URL)
			json.NewEncoder(w).Encode(models.VideoInfoResponse{
				Success:    false,
				Processing: true,
				Error:      "Video is still processing",
			})
			return
		}

		if cached.Response != nil {
			// Видео уже в кеше
			log.Printf("Видео найдено в кеше: %s", req.URL)
			json.NewEncoder(w).Encode(cached.Response)
			return
		}
	}

	// Если видео не в кеше, начинаем обработку
	h.cache.SetProcessing(req.URL)
	log.Printf("Начало обработки видео: %s", req.URL)

	// Загружаем видео в фоновом режиме
	go func() {
		videoID := req.VideoID // Сохраняем для использования в горутине
		url := req.URL

		response, err := h.downloader.Download(url)
		if err != nil {
			log.Printf("Ошибка при загрузке видео: %v", err)
			h.cache.Delete(url)

			// Публикуем событие об ошибке, если есть videoID
			if videoID != "" && h.publisher != nil {
				event := &redis.VideoReadyEvent{
					VideoID: videoID,
					URL:     url,
					Success: false,
					Error:   err.Error(),
				}
				if pubErr := h.publisher.PublishVideoReady(event); pubErr != nil {
					log.Printf("Ошибка публикации события: %v", pubErr)
				}
			}
			return
		}

		// Сохраняем в кеш ТОЛЬКО если есть video_url
		if response.VideoURL != "" {
			h.cache.Set(url, response)
			log.Printf("Видео сохранено в кеш: %s", url)

			// Публикуем событие об успехе, если есть videoID
			if videoID != "" && h.publisher != nil {
				event := &redis.VideoReadyEvent{
					VideoID:  videoID,
					URL:      url,
					VideoURL: response.VideoURL,
					Title:    response.Title,
					Author:   response.Author,
					Length:   response.Length,
					Views:    response.Views,
					Success:  true,
				}
				if pubErr := h.publisher.PublishVideoReady(event); pubErr != nil {
					log.Printf("Ошибка публикации события: %v", pubErr)
				}
			}
		} else {
			log.Printf("Видео НЕ сохранено в кеш (нет video_url): %s", url)
			h.cache.Delete(url)

			// Публикуем событие об ошибке
			if videoID != "" && h.publisher != nil {
				event := &redis.VideoReadyEvent{
					VideoID: videoID,
					URL:     url,
					Success: false,
					Error:   "No video URL available",
				}
				if pubErr := h.publisher.PublishVideoReady(event); pubErr != nil {
					log.Printf("Ошибка публикации события: %v", pubErr)
				}
			}
		}
	}()

	// Возвращаем ответ о начале обработки
	json.NewEncoder(w).Encode(models.VideoInfoResponse{
		Success:    false,
		Processing: true,
		Error:      "Video processing started",
	})
}
