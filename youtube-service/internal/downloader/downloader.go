package downloader

import (
	"context"
	"fmt"
	"log"
	"os/exec"
	"strings"
	"time"

	"github.com/wader/goutubedl"
	"github.com/wader/goutubedl/internal/models"
)

// Downloader - загрузчик видео с YouTube
type Downloader struct{}

// New создаёт новый загрузчик
func New() *Downloader {
	return &Downloader{}
}

// GetVideoURL получает прямую ссылку на видео через yt-dlp
func (d *Downloader) GetVideoURL(url string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Формат: пробуем mp4 до 720p, если не получается - любой формат до 720p
	cmd := exec.CommandContext(ctx, "yt-dlp",
		"-g",
		"-f", "best[height<=720][ext=mp4]/best[height<=720]/best[ext=mp4]/best",
		"--no-playlist",
		"--no-warnings",
		url,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("yt-dlp error: %s", string(output))
		return "", fmt.Errorf("failed to get video URL: %w", err)
	}

	// Фильтруем строки - берем только ту, что начинается с http
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "http://") || strings.HasPrefix(line, "https://") {
			return line, nil
		}
	}

	return "", fmt.Errorf("no valid HTTP URL found in output")
}

// Download загружает информацию о видео
func (d *Downloader) Download(url string) (*models.VideoInfoResponse, error) {
	log.Printf("Обработка видео: %s", url)

	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	result, err := goutubedl.New(ctx, url, goutubedl.Options{
		Type:     goutubedl.TypeSingle,
		DebugLog: log.Default(),
	})

	if err != nil {
		log.Printf("Ошибка при получении информации: %v", err)
		return nil, err
	}

	info := result.Info

	// Получаем прямую ссылку на видео через yt-dlp -g
	videoURL, err := d.GetVideoURL(url)
	if err != nil {
		log.Printf("Ошибка при получении прямой ссылки: %v", err)
		videoURL = "" // Продолжаем без видео URL
	}

	// Обрезаем описание
	description := ""
	if info.Description != "" {
		if len(info.Description) > 200 {
			description = info.Description[:200]
		} else {
			description = info.Description
		}
	}

	// Получаем разрешение из форматов
	resolution := ""
	if len(info.Formats) > 0 {
		for i := len(info.Formats) - 1; i >= 0; i-- {
			format := info.Formats[i]
			if format.Width > 0 && format.Height > 0 {
				resolution = fmt.Sprintf("%dx%d", int(format.Width), int(format.Height))
				break
			}
		}
	}

	response := &models.VideoInfoResponse{
		Success:     true,
		VideoURL:    videoURL,
		Title:       info.Title,
		Author:      info.Uploader,
		Length:      int(info.Duration),
		Views:       int(info.ViewCount),
		Description: description,
		Thumbnail:   info.Thumbnail,
		Resolution:  resolution,
	}

	log.Printf("Видео успешно обработано: %s, URL получен: %v", info.Title, videoURL != "")
	return response, nil
}
