package controllers

import (
	"backend/models"
	"backend/services"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func SavePredictions(c *gin.Context) {
	var request struct {
		DosenID          int       `json:"dosen_id"`
		MataKuliahID     int       `json:"mataKuliah_id"`
		SessionDate      time.Time `json:"session_date"`
		MonitoringRecord []struct {
			UserID     string `json:"nim"`
			Expression string `json:"ekspresi"`
			Gender     string `json:"gender"`
			Focus      string `json:"ketertarikan"`
			Time       string `json:"waktu_tercatat"`
		} `json:"MonitoringRecord"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find the session ID based on the session name and date
	sessionID, err := services.GetSessionID(request.MataKuliahID, request.SessionDate)
	if err != nil {
		// If no session is found, create a new session
		if err.Error() == "sql: no rows in result set" {
			newSession := models.Session{
				DosenID:      request.DosenID,
				MataKuliahID: request.MataKuliahID,
				SessionDate:  request.SessionDate,
			}
			sessionID, err = services.CreateSession(newSession)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create new session", "details": err.Error()})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find session ID", "details": err.Error()})
			return
		}
	}

	// Prepare the monitoring records
	var records []models.MonitoringRecord
	for _, pred := range request.MonitoringRecord {
		record := models.MonitoringRecord{
			NIM:           pred.UserID,
			Ekspresi:      pred.Expression,
			Gender:        pred.Gender,
			Ketertarikan:  pred.Focus,
			WaktuTercatat: pred.Time,
			SessionId:     sessionID,
		}
		records = append(records, record)
	}

	// Save the monitoring records
	if err := services.SaveMonitoringRecords(records); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save predictions", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Predictions saved successfully"})
}

// GetMonitoringRecordsCount retrieves the count of each 'ketertarikan' category
func GetMonitoringRecordsCount(c *gin.Context) {
	counts, err := services.GetMonitoringRecordsCount()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch monitoring records count", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": counts})
}

// GetTertarikAndTidakTertarikCounts retrieves the count of 'tertarik' and 'tidak tertarik' categories
func GetTertarikAndTidakTertarikCounts(c *gin.Context) {
	counts, err := services.GetMonitoringRecordsCount()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch monitoring records count", "details": err.Error()})
		return
	}

	tertarikCategories := map[string]bool{
		"bingung":  true,
		"fokus":    true,
		"frustasi": true,
	}

	tidakTertarikCategories := map[string]bool{
		"bosan":       true,
		"mengantuk":   true,
		"tidak-fokus": true,
	}

	tertarikCount := 0
	tidakTertarikCount := 0

	for category, count := range counts {
		if tertarikCategories[category] {
			tertarikCount += count
		} else if tidakTertarikCategories[category] {
			tidakTertarikCount += count
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"tertarik":       tertarikCount,
		"tidak_tertarik": tidakTertarikCount,
	})
}
