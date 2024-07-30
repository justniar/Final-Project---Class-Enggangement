package services

import (
	"backend/models"
	"backend/repositories"
	"time"
)

// GetSessionID retrieves the session ID based on session details
func GetSessionID(MataKuliahID int, sessionDate time.Time) (int, error) {
	return repositories.FindSessionID(MataKuliahID, sessionDate)
}

func CreateSession(session models.Session) (int, error) {
	return repositories.InsertSession(session)
}

// SaveMonitoringRecords saves multiple monitoring records to the database
func SaveMonitoringRecords(records []models.MonitoringRecord) error {
	for _, record := range records {
		if err := repositories.InsertMonitoringRecord(record); err != nil {
			return err
		}
	}
	return nil
}
