package cache

import (
	"sync"
	"time"

	"github.com/wader/goutubedl/internal/models"
)

// CachedVideo - закешированное видео
type CachedVideo struct {
	Response   *models.VideoInfoResponse
	Processing bool
	CachedAt   time.Time
}

// Cache - кеш для видео
type Cache struct {
	mu    sync.RWMutex
	cache map[string]*CachedVideo
}

// New создаёт новый кеш
func New() *Cache {
	return &Cache{
		cache: make(map[string]*CachedVideo),
	}
}

// Get получает видео из кеша
func (c *Cache) Get(url string) (*CachedVideo, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	cached, exists := c.cache[url]
	return cached, exists
}

// SetProcessing устанавливает флаг обработки
func (c *Cache) SetProcessing(url string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.cache[url] = &CachedVideo{
		Processing: true,
		CachedAt:   time.Now(),
	}
}

// Set сохраняет результат в кеш
func (c *Cache) Set(url string, response *models.VideoInfoResponse) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.cache[url] = &CachedVideo{
		Response:   response,
		Processing: false,
		CachedAt:   time.Now(),
	}
}

// Delete удаляет из кеша
func (c *Cache) Delete(url string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.cache, url)
}

// Cleanup очищает старые записи (старше TTL)
func (c *Cache) Cleanup(ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()
	for url, cached := range c.cache {
		if now.Sub(cached.CachedAt) > ttl {
			delete(c.cache, url)
		}
	}
}
