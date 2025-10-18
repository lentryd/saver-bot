package models

// VideoInfoRequest - запрос на получение информации о видео
type VideoInfoRequest struct {
	URL     string `json:"url"`
	VideoID string `json:"video_id,omitempty"` // Опциональный ID для pub/sub событий
}

// VideoInfoResponse - ответ с информацией о видео
type VideoInfoResponse struct {
	Success     bool   `json:"success"`
	VideoURL    string `json:"video_url,omitempty"`
	Title       string `json:"title,omitempty"`
	Author      string `json:"author,omitempty"`
	Length      int    `json:"length,omitempty"`
	Views       int    `json:"views,omitempty"`
	Description string `json:"description,omitempty"`
	Thumbnail   string `json:"thumbnail,omitempty"`
	Resolution  string `json:"resolution,omitempty"`
	Error       string `json:"error,omitempty"`
	Processing  bool   `json:"processing,omitempty"`
}

// HealthResponse - ответ health check
type HealthResponse struct {
	Status string `json:"status"`
}
