package validator

import "regexp"

// IsValidYouTubeURL проверяет, является ли URL валидным YouTube URL
func IsValidYouTubeURL(url string) bool {
	patterns := []string{
		`^(https?://)?(www\.)?youtube\.com/watch\?v=[\w-]+(&\S*)?$`,
		`^(https?://)?(www\.)?youtube\.com/shorts/[\w-]+(\?.*)?$`,
		`^(https?://)?(www\.)?youtu\.be/[\w-]+(\?.*)?$`,
	}

	for _, pattern := range patterns {
		matched, _ := regexp.MatchString(pattern, url)
		if matched {
			return true
		}
	}

	return false
}
