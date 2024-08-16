package repositories

import (
	"backend/config"
	"backend/models"
	"time"
)

// InsertSession inserts a new session into the database
func InsertSession(session models.Session) (int, error) {
	var sessionID int
	err := config.DB.QueryRow(
		"INSERT INTO Sessions (dosen_id, mataKuliah_id, session_date) VALUES ($1, $2, $3) RETURNING session_id",
		session.DosenID, session.MataKuliahID, session.SessionDate,
	).Scan(&sessionID)
	if err != nil {
		return 0, err
	}
	return sessionID, nil
}

// InsertMonitoringRecord inserts a new monitoring record into the database
func InsertMonitoringRecord(record models.MonitoringRecord) error {
	_, err := config.DB.Exec(
		"INSERT INTO MonitoringRecords (NIM, ekspresi, gender, ketertarikan, waktu_tercatat, session_id) VALUES ($1, $2, $3, $4, $5, $6)",
		record.NIM, record.Ekspresi, record.Gender, record.Ketertarikan, record.WaktuTercatat, record.SessionId,
	)
	if err != nil {
		return err
	}
	return nil
}

// FindSessionID retrieves the session ID for a given session name and date
func FindSessionID(mataKuliahID int, sessionDate time.Time) (int, error) {
	var sessionID int
	err := config.DB.QueryRow(
		"SELECT session_id FROM Sessions WHERE session_date = $1 AND mataKuliah_id = $2",
		sessionDate, mataKuliahID,
	).Scan(&sessionID)
	if err != nil {
		return 0, err
	}
	return sessionID, nil
}

// func GetAllMonitoringRecords() ([]models.MonitoringRecord, error) {
// 	rows, err := config.DB.Query("SELECT * FROM MonitoringRecords")
// 	if err != nil {
// 		return nil, err
// 	}
// 	defer rows.Close()

// 	var records []models.MonitoringRecord
// 	for rows.Next() {
// 		var record models.MonitoringRecord
// 		if err := rows.Scan(&record.ID, &record.NIM, &record.Ekspresi, &record.Gender, &record.Ketertarikan, &record.WaktuTercatat, &record.SessionId); err != nil {
// 			return nil, err
// 		}
// 		records = append(records, record)
// 	}

// 	return records, nil
// }

// GetMonitoringRecordsCount retrieves the count of each 'ketertarikan' category from the database
func GetMonitoringRecordsCount() (map[string]int, error) {
	rows, err := config.DB.Query("SELECT ketertarikan, COUNT(*) FROM MonitoringRecords GROUP BY ketertarikan")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var ketertarikan string
		var count int
		if err := rows.Scan(&ketertarikan, &count); err != nil {
			return nil, err
		}
		counts[ketertarikan] = count
	}

	return counts, nil
}
