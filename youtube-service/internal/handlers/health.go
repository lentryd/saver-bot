package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/wader/goutubedl/internal/models"
)

// HealthHandler обрабатывает health check запросы
func HealthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.HealthResponse{Status: "ok"})
}
