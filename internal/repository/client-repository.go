// internal/repository/client-repository.go
package repository

import (
	"database/sql"
	"math"
	"time"
)

type Client struct {
	ID              int64
	TelegramID      int64
	Contact         string
	OffertaAccepted bool
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type ClientRequest struct {
	ID          int64
	ClientID    int64
	FromAddress string
	ToAddress   string
	FromLat     float64
	FromLon     float64
	ToLat       float64
	ToLon       float64
	Price       int
	TruckType   string
	Comment     string
	Contact     string
	PhotoPath   string
	Status      string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type JustClickedUser struct {
	ID         int64
	TelegramID int64
	CreatedAt  time.Time
}

type ClientRepository struct {
	db *sql.DB
}

func NewClientRepository(db *sql.DB) *ClientRepository {
	return &ClientRepository{db: db}
}

// GetClientByTelegramID retrieves a client by telegram ID
func (cr *ClientRepository) GetClientByTelegramID(telegramID int64) (*Client, error) {
	client := &Client{}
	query := `
		SELECT id, telegram_id, contact, offerta_accepted, created_at, updated_at
		FROM client WHERE telegram_id = ?
	`
	err := cr.db.QueryRow(query, telegramID).Scan(
		&client.ID, &client.TelegramID, &client.Contact,
		&client.OffertaAccepted, &client.CreatedAt, &client.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return client, nil
}

// Insert creates a new client
func (cr *ClientRepository) Insert(client *Client) error {
	query := `
		INSERT INTO client (telegram_id, contact, offerta_accepted, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`
	result, err := cr.db.Exec(query,
		client.TelegramID, client.Contact, client.OffertaAccepted,
		client.CreatedAt, client.CreatedAt,
	)
	if err != nil {
		return err
	}

	client.ID, err = result.LastInsertId()
	return err
}

// Update updates an existing client
func (cr *ClientRepository) Update(client *Client) error {
	query := `
		UPDATE client SET 
			contact = ?, offerta_accepted = ?, updated_at = ?
		WHERE telegram_id = ?
	`
	_, err := cr.db.Exec(query,
		client.Contact, client.OffertaAccepted, time.Now(), client.TelegramID,
	)
	return err
}

// InsertRequest creates a new client request
func (cr *ClientRepository) InsertRequest(request *ClientRequest) error {
	query := `
		INSERT INTO client_request (client_id, from_address, to_address,
		                           from_lat, from_lon, to_lat, to_lon,
		                           price, truck_type, comment, contact,
		                           photo_path, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	result, err := cr.db.Exec(query,
		request.ClientID, request.FromAddress, request.ToAddress,
		request.FromLat, request.FromLon, request.ToLat, request.ToLon,
		request.Price, request.TruckType, request.Comment, request.Contact,
		request.PhotoPath, request.Status, request.CreatedAt, request.CreatedAt,
	)
	if err != nil {
		return err
	}

	request.ID, err = result.LastInsertId()
	return err
}

// GetActiveRequests retrieves all active client requests
func (cr *ClientRepository) GetActiveRequests() ([]ClientRequest, error) {
	query := `
		SELECT id, client_id, from_address, to_address,
		       from_lat, from_lon, to_lat, to_lon,
		       price, truck_type, comment, contact,
		       photo_path, status, created_at, updated_at
		FROM client_request
		WHERE status = 'active'
		ORDER BY created_at DESC
	`
	rows, err := cr.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []ClientRequest
	for rows.Next() {
		var req ClientRequest
		err := rows.Scan(
			&req.ID, &req.ClientID, &req.FromAddress, &req.ToAddress,
			&req.FromLat, &req.FromLon, &req.ToLat, &req.ToLon,
			&req.Price, &req.TruckType, &req.Comment, &req.Contact,
			&req.PhotoPath, &req.Status, &req.CreatedAt, &req.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		requests = append(requests, req)
	}
	return requests, nil
}

// GetRequestsByClient retrieves requests for a specific client
func (cr *ClientRepository) GetRequestsByClient(clientID int64) ([]ClientRequest, error) {
	query := `
		SELECT id, client_id, from_address, to_address,
		       from_lat, from_lon, to_lat, to_lon,
		       price, truck_type, comment, contact,
		       photo_path, status, created_at, updated_at
		FROM client_request
		WHERE client_id = ?
		ORDER BY created_at DESC
	`
	rows, err := cr.db.Query(query, clientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []ClientRequest
	for rows.Next() {
		var req ClientRequest
		err := rows.Scan(
			&req.ID, &req.ClientID, &req.FromAddress, &req.ToAddress,
			&req.FromLat, &req.FromLon, &req.ToLat, &req.ToLon,
			&req.Price, &req.TruckType, &req.Comment, &req.Contact,
			&req.PhotoPath, &req.Status, &req.CreatedAt, &req.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		requests = append(requests, req)
	}
	return requests, nil
}

// UpdateRequestStatus updates the status of a request
func (cr *ClientRepository) UpdateRequestStatus(requestID int64, status string) error {
	query := `
		UPDATE client_request SET status = ?, updated_at = ?
		WHERE id = ?
	`
	_, err := cr.db.Exec(query, status, time.Now(), requestID)
	return err
}

// GetClientsNearLocation returns clients who made recent requests near a location
func (cr *ClientRepository) GetClientsNearLocation(lat, lon, radiusKm float64) ([]Client, error) {
	// Get clients who made requests within the last 30 days and near the location
	query := `
		SELECT DISTINCT c.id, c.telegram_id, c.contact, c.offerta_accepted, c.created_at, c.updated_at
		FROM client c
		INNER JOIN client_request cr ON c.telegram_id = cr.client_id
		WHERE cr.created_at > datetime('now', '-30 days')
		AND ABS(cr.from_lat - ?) < ? 
		AND ABS(cr.from_lon - ?) < ?
	`

	// Rough conversion: 1 degree ≈ 111 km
	latDiff := radiusKm / 111.0
	lonDiff := radiusKm / (111.0 * math.Cos(lat*math.Pi/180.0))

	rows, err := cr.db.Query(query, lat, latDiff, lon, lonDiff)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var clients []Client
	for rows.Next() {
		var client Client
		err := rows.Scan(
			&client.ID, &client.TelegramID, &client.Contact,
			&client.OffertaAccepted, &client.CreatedAt, &client.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Calculate actual distance for more precise filtering
		// You might want to add a more sophisticated distance calculation here
		clients = append(clients, client)
	}

	return clients, nil
}

// SaveJustClickedUser saves a user who just clicked start
func (cr *ClientRepository) SaveJustClickedUser(telegramID int64) error {
	// Check if already exists
	var exists bool
	checkQuery := "SELECT EXISTS(SELECT 1 FROM just_clicked_users WHERE telegram_id = ?)"
	err := cr.db.QueryRow(checkQuery, telegramID).Scan(&exists)
	if err != nil {
		return err
	}

	if !exists {
		insertQuery := `
			INSERT INTO just_clicked_users (telegram_id, created_at)
			VALUES (?, ?)
		`
		_, err = cr.db.Exec(insertQuery, telegramID, time.Now())
		return err
	}

	return nil
}

// GetJustClickedUsers retrieves all users who clicked start
func (cr *ClientRepository) GetJustClickedUsers() ([]JustClickedUser, error) {
	query := `
		SELECT id, telegram_id, created_at
		FROM just_clicked_users
		ORDER BY created_at DESC
	`
	rows, err := cr.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []JustClickedUser
	for rows.Next() {
		var user JustClickedUser
		err := rows.Scan(&user.ID, &user.TelegramID, &user.CreatedAt)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, nil
}

// CreateTables creates the necessary tables if they don't exist
func CreateClientTables(db *sql.DB) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS client (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			telegram_id INTEGER UNIQUE NOT NULL,
			contact TEXT,
			offerta_accepted BOOLEAN DEFAULT 0,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		)`,
		`CREATE INDEX IF NOT EXISTS idx_client_telegram_id ON client(telegram_id)`,

		`CREATE TABLE IF NOT EXISTS client_request (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			client_id INTEGER NOT NULL,
			from_address TEXT NOT NULL,
			to_address TEXT NOT NULL,
			from_lat REAL NOT NULL,
			from_lon REAL NOT NULL,
			to_lat REAL NOT NULL,
			to_lon REAL NOT NULL,
			price INTEGER NOT NULL,
			truck_type TEXT NOT NULL,
			comment TEXT,
			contact TEXT NOT NULL,
			photo_path TEXT,
			status TEXT DEFAULT 'active',
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			FOREIGN KEY (client_id) REFERENCES client(telegram_id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_client_request_client_id ON client_request(client_id)`,
		`CREATE INDEX IF NOT EXISTS idx_client_request_status ON client_request(status)`,
		`CREATE INDEX IF NOT EXISTS idx_client_request_location ON client_request(from_lat, from_lon)`,

		`CREATE TABLE IF NOT EXISTS just_clicked_users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			telegram_id INTEGER UNIQUE NOT NULL,
			created_at DATETIME NOT NULL
		)`,
		`CREATE INDEX IF NOT EXISTS idx_just_clicked_telegram_id ON just_clicked_users(telegram_id)`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return err
		}
	}

	return nil
}
