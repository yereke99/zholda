// internal/repository/driver-repository.go
package repository

import (
	"database/sql"
	"math"
	"time"
)

type Driver struct {
	ID                int64
	TelegramID        int64
	FullName          string
	Contact           string
	Gender            string
	ProfilePhotoPath  string
	DriverLicensePath string
	TruckPhotoPath    string
	StartCity         string
	StartLat          float64
	StartLon          float64
	Paid              bool
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type DriverRequest struct {
	ID            int64
	DriverID      int64
	FromAddress   string
	ToAddress     string
	FromLat       float64
	FromLon       float64
	ToLat         float64
	ToLon         float64
	Price         int
	Comment       string
	DepartureTime time.Time
	Status        string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type DriverRepository struct {
	db *sql.DB
}

func NewDriverRepository(db *sql.DB) *DriverRepository {
	return &DriverRepository{db: db}
}

// CheckDriver checks if a driver exists by telegram ID
func (dr *DriverRepository) CheckDriver(telegramID int64) (bool, error) {
	var exists bool
	query := "SELECT EXISTS(SELECT 1 FROM driver WHERE telegram_id = ?)"
	err := dr.db.QueryRow(query, telegramID).Scan(&exists)
	return exists, err
}

// GetDriverByTelegramID retrieves a driver by telegram ID
func (dr *DriverRepository) GetDriverByTelegramID(telegramID int64) (*Driver, error) {
	driver := &Driver{}
	query := `
		SELECT id, telegram_id, full_name, contact, gender, 
		       profile_photo_path, driver_license_path, truck_photo_path,
		       start_city, start_lat, start_lon, paid, created_at, updated_at
		FROM driver WHERE telegram_id = ?
	`
	err := dr.db.QueryRow(query, telegramID).Scan(
		&driver.ID, &driver.TelegramID, &driver.FullName, &driver.Contact,
		&driver.Gender, &driver.ProfilePhotoPath, &driver.DriverLicensePath,
		&driver.TruckPhotoPath, &driver.StartCity, &driver.StartLat,
		&driver.StartLon, &driver.Paid, &driver.CreatedAt, &driver.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return driver, nil
}

// Insert creates a new driver
func (dr *DriverRepository) Insert(driver *Driver) error {
	query := `
		INSERT INTO driver (telegram_id, full_name, contact, gender,
		                   profile_photo_path, driver_license_path, truck_photo_path,
		                   start_city, start_lat, start_lon, paid, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	result, err := dr.db.Exec(query,
		driver.TelegramID, driver.FullName, driver.Contact, driver.Gender,
		driver.ProfilePhotoPath, driver.DriverLicensePath, driver.TruckPhotoPath,
		driver.StartCity, driver.StartLat, driver.StartLon, driver.Paid,
		driver.CreatedAt, driver.CreatedAt,
	)
	if err != nil {
		return err
	}

	driver.ID, err = result.LastInsertId()
	return err
}

// Update updates an existing driver
func (dr *DriverRepository) Update(driver *Driver) error {
	query := `
		UPDATE driver SET 
			full_name = ?, contact = ?, gender = ?,
			profile_photo_path = ?, driver_license_path = ?, truck_photo_path = ?,
			start_city = ?, start_lat = ?, start_lon = ?, paid = ?, updated_at = ?
		WHERE telegram_id = ?
	`
	_, err := dr.db.Exec(query,
		driver.FullName, driver.Contact, driver.Gender,
		driver.ProfilePhotoPath, driver.DriverLicensePath, driver.TruckPhotoPath,
		driver.StartCity, driver.StartLat, driver.StartLon, driver.Paid,
		time.Now(), driver.TelegramID,
	)
	return err
}

// InsertRequest creates a new driver request
func (dr *DriverRepository) InsertRequest(request *DriverRequest) error {
	query := `
		INSERT INTO driver_request (driver_id, from_address, to_address,
		                           from_lat, from_lon, to_lat, to_lon,
		                           price, comment, departure_time, status,
		                           created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	result, err := dr.db.Exec(query,
		request.DriverID, request.FromAddress, request.ToAddress,
		request.FromLat, request.FromLon, request.ToLat, request.ToLon,
		request.Price, request.Comment, request.DepartureTime, request.Status,
		request.CreatedAt, request.CreatedAt,
	)
	if err != nil {
		return err
	}

	request.ID, err = result.LastInsertId()
	return err
}

// GetActiveRequestsByDriver retrieves active requests for a driver
func (dr *DriverRepository) GetActiveRequestsByDriver(driverID int64) ([]DriverRequest, error) {
	query := `
		SELECT id, driver_id, from_address, to_address,
		       from_lat, from_lon, to_lat, to_lon,
		       price, comment, departure_time, status,
		       created_at, updated_at
		FROM driver_request
		WHERE driver_id = ? AND status = 'active'
		ORDER BY created_at DESC
	`
	rows, err := dr.db.Query(query, driverID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []DriverRequest
	for rows.Next() {
		var req DriverRequest
		err := rows.Scan(
			&req.ID, &req.DriverID, &req.FromAddress, &req.ToAddress,
			&req.FromLat, &req.FromLon, &req.ToLat, &req.ToLon,
			&req.Price, &req.Comment, &req.DepartureTime, &req.Status,
			&req.CreatedAt, &req.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		requests = append(requests, req)
	}
	return requests, nil
}

// GetDriversNearLocation returns drivers within a certain radius of a location
func (dr *DriverRepository) GetDriversNearLocation(lat, lon, radiusKm float64) ([]Driver, error) {
	// Using a simple approximation for distance calculation
	// For more accuracy, you could use the Haversine formula
	query := `
		SELECT id, telegram_id, full_name, contact, gender,
		       profile_photo_path, driver_license_path, truck_photo_path,
		       start_city, start_lat, start_lon, paid, created_at, updated_at
		FROM driver
		WHERE paid = 1 AND 
		      ABS(start_lat - ?) < ? AND 
		      ABS(start_lon - ?) < ?
	`

	// Rough conversion: 1 degree ≈ 111 km
	latDiff := radiusKm / 111.0
	lonDiff := radiusKm / (111.0 * math.Cos(lat*math.Pi/180.0))

	rows, err := dr.db.Query(query, lat, latDiff, lon, lonDiff)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drivers []Driver
	for rows.Next() {
		var driver Driver
		err := rows.Scan(
			&driver.ID, &driver.TelegramID, &driver.FullName, &driver.Contact,
			&driver.Gender, &driver.ProfilePhotoPath, &driver.DriverLicensePath,
			&driver.TruckPhotoPath, &driver.StartCity, &driver.StartLat,
			&driver.StartLon, &driver.Paid, &driver.CreatedAt, &driver.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Calculate actual distance
		distance := calculateDistance(lat, lon, driver.StartLat, driver.StartLon)
		if distance <= radiusKm {
			drivers = append(drivers, driver)
		}
	}
	return drivers, nil
}

// GetDriversNearRoute returns drivers whose start location is near the route
func (dr *DriverRepository) GetDriversNearRoute(fromLat, fromLon, toLat, toLon, radiusKm float64) ([]Driver, error) {
	// For simplicity, we'll check if drivers are near the start point
	// In a real application, you might want to check proximity to the entire route
	return dr.GetDriversNearLocation(fromLat, fromLon, radiusKm)
}

// GetAllDriversWithActiveRequests returns all drivers with their active requests
func (dr *DriverRepository) GetAllDriversWithActiveRequests() ([]map[string]interface{}, error) {
	query := `
		SELECT 
			d.telegram_id, d.full_name, d.profile_photo_path, d.truck_photo_path, d.contact,
			dr.from_address, dr.to_address, dr.from_lat, dr.from_lon, dr.to_lat, dr.to_lon,
			dr.price, dr.comment, dr.departure_time
		FROM driver d
		INNER JOIN driver_request dr ON d.telegram_id = dr.driver_id
		WHERE d.paid = 1 AND dr.status = 'active'
		ORDER BY dr.created_at DESC
	`

	rows, err := dr.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drivers []map[string]interface{}
	for rows.Next() {
		var telegramID int64
		var fullName, profilePhoto, truckPhoto, contact string
		var fromAddress, toAddress, comment string
		var fromLat, fromLon, toLat, toLon float64
		var price int
		var departureTime time.Time

		err := rows.Scan(
			&telegramID, &fullName, &profilePhoto, &truckPhoto, &contact,
			&fromAddress, &toAddress, &fromLat, &fromLon, &toLat, &toLon,
			&price, &comment, &departureTime,
		)
		if err != nil {
			return nil, err
		}

		driver := map[string]interface{}{
			"telegram_id":    telegramID,
			"full_name":      fullName,
			"profile_photo":  profilePhoto,
			"truck_photo":    truckPhoto,
			"contact":        contact,
			"from_address":   fromAddress,
			"to_address":     toAddress,
			"from_lat":       fromLat,
			"from_lon":       fromLon,
			"to_lat":         toLat,
			"to_lon":         toLon,
			"price":          price,
			"comment":        comment,
			"departure_time": departureTime,
			"has_telegram":   true,
			"has_whatsapp":   true, // You can implement logic to check contact format
		}
		drivers = append(drivers, driver)
	}

	return drivers, nil
}

// calculateDistance calculates the distance between two points using the Haversine formula
func calculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
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

// CreateTables creates the necessary tables if they don't exist
func CreateDriverTables(db *sql.DB) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS driver (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			telegram_id INTEGER UNIQUE NOT NULL,
			full_name TEXT NOT NULL,
			contact TEXT NOT NULL,
			gender TEXT NOT NULL,
			profile_photo_path TEXT,
			driver_license_path TEXT,
			truck_photo_path TEXT,
			start_city TEXT NOT NULL,
			start_lat REAL NOT NULL,
			start_lon REAL NOT NULL,
			paid BOOLEAN DEFAULT 1,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		)`,
		`CREATE INDEX IF NOT EXISTS idx_driver_telegram_id ON driver(telegram_id)`,
		`CREATE INDEX IF NOT EXISTS idx_driver_location ON driver(start_lat, start_lon)`,

		`CREATE TABLE IF NOT EXISTS driver_request (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			driver_id INTEGER NOT NULL,
			from_address TEXT NOT NULL,
			to_address TEXT NOT NULL,
			from_lat REAL NOT NULL,
			from_lon REAL NOT NULL,
			to_lat REAL NOT NULL,
			to_lon REAL NOT NULL,
			price INTEGER NOT NULL,
			comment TEXT,
			departure_time DATETIME NOT NULL,
			status TEXT DEFAULT 'active',
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			FOREIGN KEY (driver_id) REFERENCES driver(telegram_id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_driver_request_driver_id ON driver_request(driver_id)`,
		`CREATE INDEX IF NOT EXISTS idx_driver_request_status ON driver_request(status)`,
		`CREATE INDEX IF NOT EXISTS idx_driver_request_location ON driver_request(from_lat, from_lon)`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return err
		}
	}

	return nil
}
