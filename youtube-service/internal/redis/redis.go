package redis

import (
	"context"
	"encoding/json"
	"log"

	"github.com/redis/go-redis/v9"
)

const VideoReadyChannel = "video:ready"

// VideoReadyEvent - событие о готовности видео
type VideoReadyEvent struct {
	VideoID  string `json:"video_id"`
	URL      string `json:"url"`
	VideoURL string `json:"video_url"`
	Title    string `json:"title"`
	Author   string `json:"author"`
	Length   int    `json:"length"`
	Views    int    `json:"views"`
	Success  bool   `json:"success"`
	Error    string `json:"error,omitempty"`
}

// Publisher - публикатор событий в Redis
type Publisher struct {
	client *redis.Client
}

// NewPublisher создаёт новый публикатор
func NewPublisher(redisURL string) (*Publisher, error) {
	client := redis.NewClient(&redis.Options{
		Addr: redisURL,
	})

	// Проверяем соединение
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	log.Printf("✅ Подключено к Redis: %s", redisURL)

	return &Publisher{client: client}, nil
}

// PublishVideoReady публикует событие о готовности видео
func (p *Publisher) PublishVideoReady(event *VideoReadyEvent) error {
	ctx := context.Background()

	data, err := json.Marshal(event)
	if err != nil {
		return err
	}

	if err := p.client.Publish(ctx, VideoReadyChannel, data).Err(); err != nil {
		return err
	}

	log.Printf("📢 Опубликовано событие video:ready для videoId: %s", event.VideoID)
	return nil
}

// Close закрывает соединение с Redis
func (p *Publisher) Close() error {
	return p.client.Close()
}
