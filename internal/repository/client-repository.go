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

// GetRequestsNearLocation returns client requests near a specific location
func (cr *ClientRepository) GetRequestsNearLocation(lat, lon, radiusKm float64) ([]ClientRequest, error) {
	// Using Haversine formula for accurate distance calculation
	query := `
		SELECT id, client_id, from_address, to_address,
		       from_lat, from_lon, to_lat, to_lon,
		       price, truck_type, comment, contact,
		       photo_path, status, created_at, updated_at,
		       (6371 * acos(cos(radians(?)) * cos(radians(from_lat)) * 
		        cos(radians(from_lon) - radians(?)) + 
		        sin(radians(?)) * sin(radians(from_lat)))) AS distance
		FROM client_request
		WHERE status = 'active'
		HAVING distance < ?
		ORDER BY distance ASC, created_at DESC
		LIMIT 50
	`

	rows, err := cr.db.Query(query, lat, lon, lat, radiusKm)
	if err != nil {
		// Fallback to simpler query if Haversine fails
		return cr.getRequestsNearLocationSimple(lat, lon, radiusKm)
	}
	defer rows.Close()

	var requests []ClientRequest
	for rows.Next() {
		var req ClientRequest
		var distance float64
		err := rows.Scan(
			&req.ID, &req.ClientID, &req.FromAddress, &req.ToAddress,
			&req.FromLat, &req.FromLon, &req.ToLat, &req.ToLon,
			&req.Price, &req.TruckType, &req.Comment, &req.Contact,
			&req.PhotoPath, &req.Status, &req.CreatedAt, &req.UpdatedAt,
			&distance,
		)
		if err != nil {
			continue // Skip invalid rows
		}
		requests = append(requests, req)
	}

	if len(requests) == 0 {
		// Fallback to simple method if no results
		return cr.getRequestsNearLocationSimple(lat, lon, radiusKm)
	}

	return requests, nil
}

// getRequestsNearLocationSimple is a fallback method using simple coordinate comparison
func (cr *ClientRepository) getRequestsNearLocationSimple(lat, lon, radiusKm float64) ([]ClientRequest, error) {
	// Rough conversion: 1 degree ≈ 111 km
	latDiff := radiusKm / 111.0
	lonDiff := radiusKm / (111.0 * math.Cos(lat*math.Pi/180.0))

	query := `
		SELECT id, client_id, from_address, to_address,
		       from_lat, from_lon, to_lat, to_lon,
		       price, truck_type, comment, contact,
		       photo_path, status, created_at, updated_at
		FROM client_request
		WHERE status = 'active'
		AND ABS(from_lat - ?) < ? 
		AND ABS(from_lon - ?) < ?
		ORDER BY created_at DESC
		LIMIT 50
	`

	rows, err := cr.db.Query(query, lat, latDiff, lon, lonDiff)
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
			continue
		}

		// Calculate actual distance for more precise filtering
		distance := cr.calculateDistance(lat, lon, req.FromLat, req.FromLon)
		if distance <= radiusKm {
			requests = append(requests, req)
		}
	}

	return requests, nil
}

// GetRequestsByRoute returns client requests matching route cities
func (cr *ClientRepository) GetRequestsByRoute(fromCity, toCity string) ([]ClientRequest, error) {
	query := `
		SELECT id, client_id, from_address, to_address,
		       from_lat, from_lon, to_lat, to_lon,
		       price, truck_type, comment, contact,
		       photo_path, status, created_at, updated_at
		FROM client_request
		WHERE status = 'active'
		AND (
			(LOWER(from_address) LIKE LOWER(?) OR LOWER(from_address) LIKE LOWER(?))
			AND (LOWER(to_address) LIKE LOWER(?) OR LOWER(to_address) LIKE LOWER(?))
		)
		ORDER BY created_at DESC
		LIMIT 50
	`

	fromPattern1 := "%" + fromCity + "%"
	fromPattern2 := fromCity + "%"
	toPattern1 := "%" + toCity + "%"
	toPattern2 := toCity + "%"

	rows, err := cr.db.Query(query, fromPattern1, fromPattern2, toPattern1, toPattern2)
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
			continue
		}
		requests = append(requests, req)
	}

	return requests, nil
}

// GetRequestsInRegion returns requests within a broader region (for fallback)
func (cr *ClientRepository) GetRequestsInRegion(lat, lon float64) ([]ClientRequest, error) {
	// Get requests within 200km radius as fallback
	return cr.GetRequestsNearLocation(lat, lon, 200.0)
}

// calculateDistance calculates the distance between two points using the Haversine formula
func (cr *ClientRepository) calculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371 // Earth's radius in kilometers

	lat1Rad := lat1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	deltaLat := (lat2 - lat1) * math.Pi / 180
	deltaLon := (lon2 - lon1) * math.Pi / 180

	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*
			math.Sin(deltaLon/2)*math.Sin(deltaLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
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
