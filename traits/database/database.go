package database

import (
	"database/sql"
	"zholda/internal/repository"
)

// createTables creates all necessary tables if they don't exist
func CreateTables(db *sql.DB) error {
	// Create driver tables
	if err := repository.CreateDriverTables(db); err != nil {
		return err
	}

	// Create client tables
	if err := repository.CreateClientTables(db); err != nil {
		return err
	}

	return nil
}
