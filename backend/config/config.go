package config

import (
	"database/sql"
	"fmt"
	"log"
)

var DB *sql.DB

func ConnectDatabase() {
	var err error
	dsn := "host=localhost user=postgres password=postgres dbname=monitoring_db port=5432 sslmode=disable"
	DB, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	err = DB.Ping()
	if err != nil {
		log.Fatal("Failed to ping database:", err)
	}
	fmt.Println("Database connection established")
}
