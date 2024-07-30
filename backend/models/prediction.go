package models

import "time"

type MonitoringRecord struct {
	ID            int     `json:"id"`
	NIM           string  `json:"userId"`
	Ekspresi      string  `json:"expression"`
	Gender        string  `json:"gender"`
	Ketertarikan  string  `json:"focus"`
	Confidence    float64 `json:"confidence"`
	WaktuTercatat string  `json:"time"`
	SessionId     int     `json:"session_id"`
}

type Session struct {
	SessionID    int                `json:"session_id"`
	DosenID      int                `json:"dosen_id"`
	MataKuliahID int                `json:"mataKuliah_id"`
	SessionDate  time.Time          `json:"session_date"`
	Predictions  []MonitoringRecord `json:"MonitoringRecords"`
}
