// handler/handler.go
package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"
	"zholda/config"
	"zholda/internal/repository"

	"github.com/go-telegram/bot"
	"github.com/go-telegram/bot/models"
	"go.uber.org/zap"
)

type Handler struct {
	driverRepo *repository.DriverRepository
	clientRepo *repository.ClientRepository
	logger     *zap.Logger
	cfg        *config.Config
}

// NewHandler creates a new handler instance
func NewHandler(driverRepo *repository.DriverRepository, clientRepo *repository.ClientRepository, logger *zap.Logger, cfg *config.Config) *Handler {
	return &Handler{
		driverRepo: driverRepo,
		clientRepo: clientRepo,
		logger:     logger,
		cfg:        cfg,
	}
}

// setCORSHeaders sets CORS headers for HTTP responses
func (h *Handler) setCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
}

// StartHandler handles the /start command
func (h *Handler) StartHandler(ctx context.Context, b *bot.Bot, update *models.Update) {
	if update.Message == nil {
		return
	}

	// Save user to justClickedUsers table
	if err := h.clientRepo.SaveJustClickedUser(update.Message.From.ID); err != nil {
		h.logger.Warn("Failed to save just clicked user", zap.Error(err))
	}

	kb := &models.ReplyKeyboardMarkup{
		Keyboard: [][]models.KeyboardButton{
			{
				{Text: "🚚 Регистрация водитель", WebApp: &models.WebAppInfo{URL: h.cfg.BaseURL + "/driver-register"}},
			},
			{
				{Text: "📦 Заказать доставку", WebApp: &models.WebAppInfo{URL: h.cfg.BaseURL + "/client"}},
			},
		},
		ResizeKeyboard: true,
	}

	_, err := b.SendMessage(ctx, &bot.SendMessageParams{
		ChatID: update.Message.Chat.ID,
		Text: "🚚 Добро пожаловать в ZholDa!\n\n" +
			"Выберите действие:\n" +
			"• Регистрация водителей - для тех, кто хочет предоставлять услуги доставки\n" +
			"• Заказать доставку - для тех, кто хочет отправить груз",
		ReplyMarkup: kb,
	})
	if err != nil {
		h.logger.Warn("Failed to send start message", zap.Error(err))
	}
}

// CheckDriverHandler checks if driver exists
func (h *Handler) CheckDriverHandler(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req struct {
		TelegramID string `json:"telegram_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	telegramID, err := strconv.ParseInt(req.TelegramID, 10, 64)
	if err != nil {
		http.Error(w, "Invalid telegram ID", http.StatusBadRequest)
		return
	}

	exists, err := h.driverRepo.CheckDriver(telegramID)
	if err != nil {
		h.logger.Error("Error checking driver", zap.Error(err))
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	response := map[string]bool{"exists": exists}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetDriverProfileHandler returns driver profile data
func (h *Handler) GetDriverProfileHandler(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	h.logger.Info("GetDriverProfileHandler called",
		zap.String("method", r.Method),
		zap.String("url", r.URL.String()),
		zap.String("remote_addr", r.RemoteAddr))

	var req struct {
		TelegramID string `json:"telegram_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Error decoding request body", zap.Error(err))
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	h.logger.Info("Received profile request", zap.String("telegram_id", req.TelegramID))

	telegramID, err := strconv.ParseInt(req.TelegramID, 10, 64)
	if err != nil {
		h.logger.Error("Error parsing telegram ID", zap.String("telegram_id", req.TelegramID), zap.Error(err))
		http.Error(w, "Invalid telegram ID", http.StatusBadRequest)
		return
	}

	h.logger.Info("Getting driver profile", zap.Int64("telegram_id", telegramID))

	driver, err := h.driverRepo.GetDriverByTelegramID(telegramID)
	if err != nil {
		if err == sql.ErrNoRows {
			h.logger.Warn("Driver not found", zap.Int64("telegram_id", telegramID))
			response := map[string]interface{}{
				"success": false,
				"message": "Driver not found",
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
			return
		}
		h.logger.Error("Error getting driver profile", zap.Error(err))
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	h.logger.Info("Driver profile found", zap.Int64("telegram_id", telegramID), zap.String("full_name", driver.FullName))

	response := map[string]interface{}{
		"success": true,
		"driver": map[string]interface{}{
			"telegram_id":         driver.TelegramID,
			"full_name":           driver.FullName,
			"contact":             driver.Contact,
			"gender":              driver.Gender,
			"profile_photo_path":  driver.ProfilePhotoPath,
			"driver_license_path": driver.DriverLicensePath,
			"truck_photo_path":    driver.TruckPhotoPath,
			"start_city":          driver.StartCity,
			"start_lat":           driver.StartLat,
			"start_lon":           driver.StartLon,
			"paid":                driver.Paid,
			"created_at":          driver.CreatedAt,
			"updated_at":          driver.UpdatedAt,
		},
	}

	h.logger.Info("Sending driver profile response", zap.Int64("telegram_id", telegramID))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// UpdateDriverProfileHandler updates driver profile
func (h *Handler) UpdateDriverProfileHandler(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, "Error parsing form: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Extract form data
	telegramIDStr := r.FormValue("telegram_id")
	fullName := r.FormValue("full_name")
	contact := r.FormValue("contact")
	gender := r.FormValue("gender")
	startCity := r.FormValue("start_city")
	startLat := r.FormValue("start_lat")
	startLon := r.FormValue("start_lon")

	telegramID, err := strconv.ParseInt(telegramIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid telegram ID", http.StatusBadRequest)
		return
	}

	h.logger.Info("Updating driver profile", zap.Int64("telegram_id", telegramID))

	// Get existing driver
	driver, err := h.driverRepo.GetDriverByTelegramID(telegramID)
	if err != nil {
		if err == sql.ErrNoRows {
			response := map[string]interface{}{
				"success": false,
				"message": "Driver not found",
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
			return
		}
		h.logger.Error("Error getting driver for update", zap.Error(err))
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Update fields
	driver.FullName = fullName
	driver.Contact = contact
	driver.Gender = gender
	driver.StartCity = startCity

	if startLat != "" {
		if lat, err := strconv.ParseFloat(startLat, 64); err == nil {
			driver.StartLat = lat
		}
	}
	if startLon != "" {
		if lon, err := strconv.ParseFloat(startLon, 64); err == nil {
			driver.StartLon = lon
		}
	}

	// Create directories if not exist
	if err := os.MkdirAll("./profile-photo", 0755); err != nil {
		h.logger.Error("Failed to create profile-photo directory", zap.Error(err))
	}
	if err := os.MkdirAll("./truck-photo", 0755); err != nil {
		h.logger.Error("Failed to create truck-photo directory", zap.Error(err))
	}
	if err := os.MkdirAll("./documents", 0755); err != nil {
		h.logger.Error("Failed to create documents directory", zap.Error(err))
	}

	if file, header, err := r.FormFile("profile_photo"); err == nil {
		defer file.Close()
		filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), header.Filename)
		fullPath := filepath.Join("./profile-photo", filename)

		if out, err := os.Create(fullPath); err == nil {
			defer out.Close()
			if driver.ProfilePhotoPath != "" {
				oldPath := filepath.Join("./profile-photo", driver.ProfilePhotoPath)
				if err := os.Remove(oldPath); err != nil {
					h.logger.Error("Failed to remove old profile photo", zap.Error(err))
				}
			}
			if _, err := io.Copy(out, file); err == nil {
				driver.ProfilePhotoPath = filename
				h.logger.Info("Profile photo uploaded successfully", zap.String("Filename", filename))
			} else {
				h.logger.Error("Failed to save profile photo", zap.Error(err))
			}
		}
	}

	// Handle truck photo upload if provided
	if file, header, err := r.FormFile("truck_photo"); err == nil {
		defer file.Close()

		// Create directory if not exists
		if err := os.MkdirAll("./truck-photo", 0755); err == nil {
			filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), header.Filename)
			fullPath := filepath.Join("./truck-photo", filename)

			if out, err := os.Create(fullPath); err == nil {
				defer out.Close()
				if _, err := io.Copy(out, file); err == nil {
					// Delete old truck photo if exists
					if driver.TruckPhotoPath != "" {
						oldPath := filepath.Join("./truck-photo", driver.TruckPhotoPath)
						os.Remove(oldPath)
					}
					driver.TruckPhotoPath = filename
				}
			}
		}
	}

	if file, header, err := r.FormFile("driver_license"); err == nil {
		defer file.Close()
		filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), header.Filename)
		fullPath := filepath.Join("./documents", filename)
		if out, err := os.Create(fullPath); err == nil {
			defer out.Close()
			if driver.ProfilePhotoPath != "" {
				oldPath := filepath.Join("./documents", driver.ProfilePhotoPath)
				if err := os.Remove(oldPath); err != nil {
					h.logger.Error("Failed to remove old docunent photo", zap.Error(err))
				}
			}
			if _, err := io.Copy(out, file); err == nil {
				driver.DriverLicensePath = filename
				h.logger.Info("Document photo uploaded successfully", zap.String("Filename", filename))
			} else {
				h.logger.Error("Failed to save document photo", zap.Error(err))
			}
		}
	}

	// Update in database
	if err := h.driverRepo.Update(driver); err != nil {
		h.logger.Error("Error updating driver", zap.Error(err))
		http.Error(w, "Failed to update driver", http.StatusInternalServerError)
		return
	}

	h.logger.Info("Driver profile updated successfully", zap.Int64("telegram_id", telegramID))

	response := map[string]interface{}{
		"success": true,
		"message": "Profile updated successfully",
		"driver": map[string]interface{}{
			"telegram_id":         driver.TelegramID,
			"full_name":           driver.FullName,
			"contact":             driver.Contact,
			"gender":              driver.Gender,
			"profile_photo_path":  driver.ProfilePhotoPath,
			"driver_license_path": driver.DriverLicensePath,
			"truck_photo_path":    driver.TruckPhotoPath,
			"start_city":          driver.StartCity,
			"start_lat":           driver.StartLat,
			"start_lon":           driver.StartLon,
			"paid":                driver.Paid,
			"created_at":          driver.CreatedAt,
			"updated_at":          driver.UpdatedAt,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// RegisterDriverHandler handles driver registration
func (h *Handler) RegisterDriverHandler(w http.ResponseWriter, r *http.Request, ctx context.Context, b *bot.Bot) {
	h.setCORSHeaders(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, "Error parsing form: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Extract form data
	telegramIDStr := r.FormValue("telegram_id")
	fullName := r.FormValue("full_name")
	contact := r.FormValue("contact")
	gender := r.FormValue("gender")
	startCity := r.FormValue("start_city")
	startLat := r.FormValue("start_lat")
	startLon := r.FormValue("start_lon")

	telegramID, err := strconv.ParseInt(telegramIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid telegram ID", http.StatusBadRequest)
		return
	}

	// Create directories if not exist
	if err := os.MkdirAll("./profile-photo", 0755); err != nil {
		h.logger.Error("Failed to create profile-photo directory", zap.Error(err))
	}
	if err := os.MkdirAll("./truck-photo", 0755); err != nil {
		h.logger.Error("Failed to create truck-photo directory", zap.Error(err))
	}
	if err := os.MkdirAll("./documents", 0755); err != nil {
		h.logger.Error("Failed to create truck-photo directory", zap.Error(err))
	}

	// Save profile photo
	profilePhotoPath := ""
	if file, header, err := r.FormFile("profile_photo"); err == nil {
		defer file.Close()
		filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), header.Filename)
		fullPath := filepath.Join("./profile-photo", filename)

		if out, err := os.Create(fullPath); err == nil {
			defer out.Close()
			if _, err := io.Copy(out, file); err == nil {
				profilePhotoPath = filename
			}
		}
	}

	// Save driver license
	driverLicensePath := ""
	if file, header, err := r.FormFile("driver_license"); err == nil {
		defer file.Close()
		filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), header.Filename)
		fullPath := filepath.Join("./documents", filename)

		if err := os.MkdirAll("./documents", 0755); err == nil {
			if out, err := os.Create(fullPath); err == nil {
				defer out.Close()
				if _, err := io.Copy(out, file); err == nil {
					driverLicensePath = filename
				}
			}
		}
	}

	// Save truck photo
	truckPhotoPath := ""
	if file, header, err := r.FormFile("truck_photo"); err == nil {
		defer file.Close()
		filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), header.Filename)
		fullPath := filepath.Join("./truck-photo", filename)

		if out, err := os.Create(fullPath); err == nil {
			defer out.Close()
			if _, err := io.Copy(out, file); err == nil {
				truckPhotoPath = filename
			}
		}
	}

	// Parse coordinates
	lat, _ := strconv.ParseFloat(startLat, 64)
	lon, _ := strconv.ParseFloat(startLon, 64)

	// Create driver object
	driver := &repository.Driver{
		TelegramID:        telegramID,
		FullName:          fullName,
		Contact:           contact,
		Gender:            gender,
		ProfilePhotoPath:  profilePhotoPath,
		DriverLicensePath: driverLicensePath,
		TruckPhotoPath:    truckPhotoPath,
		StartCity:         startCity,
		StartLat:          lat,
		StartLon:          lon,
		Paid:              true, // Default to true as mentioned
		CreatedAt:         time.Now(),
	}

	// Save to database
	if err := h.driverRepo.Insert(driver); err != nil {
		h.logger.Error("Error saving driver", zap.Error(err))
		http.Error(w, "Failed to save driver", http.StatusInternalServerError)
		return
	}

	// Send success notification to driver
	go func() {
		_, err := b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: telegramID,
			Text:   "✅ Поздравляем! Вы успешно зарегистрированы как водитель.\n\nТеперь вы можете создавать заявки и принимать заказы от клиентов.",
		})
		if err != nil {
			h.logger.Warn("Failed to send registration notification", zap.Error(err))
		}
	}()

	// Send response
	response := map[string]interface{}{
		"success": true,
		"message": "Driver registered successfully",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// CreateDriverRequestHandler handles driver request creation
func (h *Handler) CreateDriverRequestHandler(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "Error parsing form", http.StatusBadRequest)
		return
	}

	// Extract form data
	telegramIDStr := r.FormValue("telegram_id")
	fromAddress := r.FormValue("from_address")
	toAddress := r.FormValue("to_address")
	price := r.FormValue("price")
	comment := r.FormValue("comment")
	departureTime := r.FormValue("departure_time")
	fromLat := r.FormValue("from_lat")
	fromLon := r.FormValue("from_lon")
	toLat := r.FormValue("to_lat")
	toLon := r.FormValue("to_lon")

	telegramID, _ := strconv.ParseInt(telegramIDStr, 10, 64)
	priceInt, _ := strconv.Atoi(price)
	fromLatFloat, _ := strconv.ParseFloat(fromLat, 64)
	fromLonFloat, _ := strconv.ParseFloat(fromLon, 64)
	toLatFloat, _ := strconv.ParseFloat(toLat, 64)
	toLonFloat, _ := strconv.ParseFloat(toLon, 64)

	depTime, _ := time.Parse("2006-01-02T15:04", departureTime)

	request := &repository.DriverRequest{
		DriverID:      telegramID,
		FromAddress:   fromAddress,
		ToAddress:     toAddress,
		FromLat:       fromLatFloat,
		FromLon:       fromLonFloat,
		ToLat:         toLatFloat,
		ToLon:         toLonFloat,
		Price:         priceInt,
		Comment:       comment,
		DepartureTime: depTime,
		Status:        "active",
		CreatedAt:     time.Now(),
	}

	if err := h.driverRepo.InsertRequest(request); err != nil {
		h.logger.Error("Error saving driver request", zap.Error(err))
		http.Error(w, "Failed to save request", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"message": "Request created successfully",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetClientRequestsHandler returns client requests for drivers
func (h *Handler) GetClientRequestsHandler(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	requests, err := h.clientRepo.GetActiveRequests()
	if err != nil {
		h.logger.Error("Error getting client requests", zap.Error(err))
		http.Error(w, "Failed to get requests", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"requests": requests,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// CheckClientHandler checks if client exists
func (h *Handler) CheckClientHandler(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req struct {
		TelegramID string `json:"telegram_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	telegramID, err := strconv.ParseInt(req.TelegramID, 10, 64)
	if err != nil {
		http.Error(w, "Invalid telegram ID", http.StatusBadRequest)
		return
	}

	client, err := h.clientRepo.GetClientByTelegramID(telegramID)
	if err != nil && err != sql.ErrNoRows {
		h.logger.Error("Error checking client", zap.Error(err))
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	response := map[string]bool{
		"exists":           client != nil,
		"offerta_accepted": client != nil && client.OffertaAccepted,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// CreateClientRequestHandler handles client request creation
func (h *Handler) CreateClientRequestHandler(w http.ResponseWriter, r *http.Request, ctx context.Context, b *bot.Bot) {
	h.setCORSHeaders(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, "Error parsing form", http.StatusBadRequest)
		return
	}

	// Extract form data
	telegramIDStr := r.FormValue("telegram_id")
	fromAddress := r.FormValue("from_address")
	toAddress := r.FormValue("to_address")
	price := r.FormValue("price")
	truckType := r.FormValue("truck_type")
	comment := r.FormValue("comment")
	contact := r.FormValue("contact")
	fromLat := r.FormValue("from_lat")
	fromLon := r.FormValue("from_lon")
	toLat := r.FormValue("to_lat")
	toLon := r.FormValue("to_lon")

	telegramID, _ := strconv.ParseInt(telegramIDStr, 10, 64)
	priceInt, _ := strconv.Atoi(price)
	fromLatFloat, _ := strconv.ParseFloat(fromLat, 64)
	fromLonFloat, _ := strconv.ParseFloat(fromLon, 64)
	toLatFloat, _ := strconv.ParseFloat(toLat, 64)
	toLonFloat, _ := strconv.ParseFloat(toLon, 64)

	// Save client if not exists
	client, err := h.clientRepo.GetClientByTelegramID(telegramID)
	if err == sql.ErrNoRows {
		// Create new client
		client = &repository.Client{
			TelegramID:      telegramID,
			Contact:         contact,
			OffertaAccepted: true,
			CreatedAt:       time.Now(),
		}
		if err := h.clientRepo.Insert(client); err != nil {
			h.logger.Error("Error saving client", zap.Error(err))
		}
	}

	// Save item photo if provided
	itemPhotoPath := ""
	if file, header, err := r.FormFile("item_photo"); err == nil {
		defer file.Close()
		if err := os.MkdirAll("./client-item-photo", 0755); err == nil {
			filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), header.Filename)
			fullPath := filepath.Join("./client-item-photo", filename)

			if out, err := os.Create(fullPath); err == nil {
				defer out.Close()
				if _, err := io.Copy(out, file); err == nil {
					itemPhotoPath = filename
				}
			}
		}
	}

	// Create client request
	request := &repository.ClientRequest{
		ClientID:    telegramID,
		FromAddress: fromAddress,
		ToAddress:   toAddress,
		FromLat:     fromLatFloat,
		FromLon:     fromLonFloat,
		ToLat:       toLatFloat,
		ToLon:       toLonFloat,
		Price:       priceInt,
		TruckType:   truckType,
		Comment:     comment,
		Contact:     contact,
		PhotoPath:   itemPhotoPath,
		Status:      "active",
		CreatedAt:   time.Now(),
	}

	if err := h.clientRepo.InsertRequest(request); err != nil {
		h.logger.Error("Error saving client request", zap.Error(err))
		http.Error(w, "Failed to save request", http.StatusInternalServerError)
		return
	}

	// Notify drivers in the area
	go h.notifyNearbyDrivers(ctx, b, request)

	response := map[string]interface{}{
		"success": true,
		"message": "Request created successfully",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetMatchingDriversHandler returns drivers matching client's route
func (h *Handler) GetMatchingDriversHandler(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Get query parameters
	fromLat, _ := strconv.ParseFloat(r.URL.Query().Get("from_lat"), 64)
	fromLon, _ := strconv.ParseFloat(r.URL.Query().Get("from_lon"), 64)
	toLat, _ := strconv.ParseFloat(r.URL.Query().Get("to_lat"), 64)
	toLon, _ := strconv.ParseFloat(r.URL.Query().Get("to_lon"), 64)

	// Get matching drivers (within 10km radius)
	drivers, err := h.driverRepo.GetDriversNearRoute(fromLat, fromLon, toLat, toLon, 10.0)
	if err != nil {
		h.logger.Error("Error getting matching drivers", zap.Error(err))
		http.Error(w, "Failed to get drivers", http.StatusInternalServerError)
		return
	}

	// Enrich driver data with their active requests
	var enrichedDrivers []map[string]interface{}
	for _, driver := range drivers {
		requests, _ := h.driverRepo.GetActiveRequestsByDriver(driver.TelegramID)
		if len(requests) > 0 {
			// Use the most recent request
			req := requests[0]
			enrichedDriver := map[string]interface{}{
				"telegram_id":    driver.TelegramID,
				"full_name":      driver.FullName,
				"profile_photo":  driver.ProfilePhotoPath,
				"truck_photo":    driver.TruckPhotoPath,
				"contact":        driver.Contact,
				"from_address":   req.FromAddress,
				"to_address":     req.ToAddress,
				"from_lat":       req.FromLat,
				"from_lon":       req.FromLon,
				"to_lat":         req.ToLat,
				"to_lon":         req.ToLon,
				"price":          req.Price,
				"comment":        req.Comment,
				"departure_time": req.DepartureTime,
				"has_telegram":   true,
				"has_whatsapp":   true, // You can check this based on contact format
			}
			enrichedDrivers = append(enrichedDrivers, enrichedDriver)
		}
	}

	response := map[string]interface{}{
		"drivers": enrichedDrivers,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// FileServerHandler serves static files (photos)
func (h *Handler) FileServerHandler(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w)

	// Extract the file type and filename from URL
	// Expected format: /files/{filename}
	// The filename should contain the file path

	path := r.URL.Path[7:] // Remove "/files/" prefix

	// Security check to prevent directory traversal
	if filepath.IsAbs(path) || filepath.Clean(path) != path {
		http.NotFound(w, r)
		return
	}

	// Check which directory the file is in based on filename
	var fullPath string

	// Try different directories
	for _, dir := range []string{"./profile-photo", "./truck-photo", "./client-item-photo", "./documents"} {
		testPath := filepath.Join(dir, path)
		if _, err := os.Stat(testPath); err == nil {
			fullPath = testPath
			break
		}
	}

	if fullPath == "" {
		http.NotFound(w, r)
		return
	}

	http.ServeFile(w, r, fullPath)
}

// notifyNearbyDrivers sends notifications to drivers near the client's pickup location
func (h *Handler) notifyNearbyDrivers(ctx context.Context, b *bot.Bot, request *repository.ClientRequest) {
	// Get drivers within 15km of pickup location
	drivers, err := h.driverRepo.GetDriversNearLocation(request.FromLat, request.FromLon, 15.0)
	if err != nil {
		h.logger.Error("Error getting nearby drivers", zap.Error(err))
		return
	}

	// Truck type emojis
	truckEmojis := map[string]string{
		"small":        "🚐",
		"medium":       "🚚",
		"large":        "🚛",
		"refrigerator": "❄️",
		"tow":          "🚗",
	}

	emoji := truckEmojis[request.TruckType]
	if emoji == "" {
		emoji = "🚚"
	}

	// Create message text
	msgText := fmt.Sprintf(
		"🆕 Новый заказ!\n\n"+
			"📍 Откуда: %s\n"+
			"🎯 Куда: %s\n"+
			"💰 Цена: %d ₸\n"+
			"%s Тип транспорта: %s\n",
		request.FromAddress,
		request.ToAddress,
		request.Price,
		emoji,
		request.TruckType,
	)

	if request.Comment != "" {
		msgText += fmt.Sprintf("💬 Комментарий: %s\n", request.Comment)
	}

	msgText += fmt.Sprintf("\n📱 Контакт: %s", request.Contact)

	// Send notification to each driver
	for _, driver := range drivers {
		_, err := b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: driver.TelegramID,
			Text:   msgText,
		})
		if err != nil {
			h.logger.Warn("Failed to notify driver",
				zap.Int64("driver_id", driver.TelegramID),
				zap.Error(err))
		}
	}
}

// GetDriverSearchHandler handles intelligent search for client orders
func (h *Handler) GetDriverSearchHandler(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Get query parameters
	telegramIDStr := r.URL.Query().Get("telegram_id")
	searchType := r.URL.Query().Get("search_type") // "geolocation" or "route"

	// For geolocation search
	driverLat, _ := strconv.ParseFloat(r.URL.Query().Get("driver_lat"), 64)
	driverLon, _ := strconv.ParseFloat(r.URL.Query().Get("driver_lon"), 64)
	radiusKm, _ := strconv.ParseFloat(r.URL.Query().Get("radius"), 64)

	// For route search
	fromCity := r.URL.Query().Get("from_city")
	toCity := r.URL.Query().Get("to_city")

	if radiusKm == 0 {
		radiusKm = 50.0 // Default 50km radius
	}

	telegramID, err := strconv.ParseInt(telegramIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid telegram ID", http.StatusBadRequest)
		return
	}

	h.logger.Info("Driver search request",
		zap.Int64("telegram_id", telegramID),
		zap.String("search_type", searchType),
		zap.Float64("driver_lat", driverLat),
		zap.Float64("driver_lon", driverLon),
		zap.Float64("radius", radiusKm),
		zap.String("from_city", fromCity),
		zap.String("to_city", toCity))

	var requests []repository.ClientRequest
	var searchErr error

	// Get driver info for fallback location
	driver, err := h.driverRepo.GetDriverByTelegramID(telegramID)
	if err != nil && err != sql.ErrNoRows {
		h.logger.Error("Error getting driver info", zap.Error(err))
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if searchType == "geolocation" && driverLat != 0 && driverLon != 0 {
		// Priority 1: Use current geolocation
		h.logger.Info("Searching by geolocation", zap.Float64("lat", driverLat), zap.Float64("lon", driverLon))
		requests, searchErr = h.clientRepo.GetRequestsNearLocation(driverLat, driverLon, radiusKm)
	} else if searchType == "route" && fromCity != "" && toCity != "" {
		// Priority 2: Search by route string match
		h.logger.Info("Searching by route", zap.String("from", fromCity), zap.String("to", toCity))
		requests, searchErr = h.clientRepo.GetRequestsByRoute(fromCity, toCity)
	} else if driver != nil && driver.StartLat != 0 && driver.StartLon != 0 {
		// Priority 3: Fallback to driver's registered start location
		h.logger.Info("Searching by driver start location", zap.Float64("lat", driver.StartLat), zap.Float64("lon", driver.StartLon))
		requests, searchErr = h.clientRepo.GetRequestsNearLocation(driver.StartLat, driver.StartLon, radiusKm)
	} else {
		// Priority 4: Get all active requests
		h.logger.Info("Getting all active requests")
		requests, searchErr = h.clientRepo.GetActiveRequests()
	}

	if searchErr != nil {
		h.logger.Error("Error searching client requests", zap.Error(searchErr))
		http.Error(w, "Failed to search requests", http.StatusInternalServerError)
		return
	}

	h.logger.Info("Found requests", zap.Int("count", len(requests)))

	// Convert to response format
	var responseRequests []map[string]interface{}
	for _, req := range requests {
		responseReq := map[string]interface{}{
			"id":           req.ID,
			"client_id":    req.ClientID,
			"from_address": req.FromAddress,
			"to_address":   req.ToAddress,
			"from_lat":     req.FromLat,
			"from_lon":     req.FromLon,
			"to_lat":       req.ToLat,
			"to_lon":       req.ToLon,
			"price":        req.Price,
			"truck_type":   req.TruckType,
			"comment":      req.Comment,
			"contact":      req.Contact,
			"photo_path":   req.PhotoPath,
			"status":       req.Status,
			"created_at":   req.CreatedAt,
			"updated_at":   req.UpdatedAt,
		}
		responseRequests = append(responseRequests, responseReq)
	}

	response := map[string]interface{}{
		"success":     true,
		"requests":    responseRequests,
		"search_type": searchType,
		"count":       len(requests),
	}

	if driver != nil {
		response["driver_start_city"] = driver.StartCity
		response["driver_start_lat"] = driver.StartLat
		response["driver_start_lon"] = driver.StartLon
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Add this to your StartWebServer function in handler.go

func (h *Handler) StartWebServer(ctx context.Context, b *bot.Bot) {
	// API routes
	http.HandleFunc("/api/driver/check", h.CheckDriverHandler)

	// ADD THIS LINE - this is what's missing!
	http.HandleFunc("/api/driver/profile", h.GetDriverProfileHandler)

	http.HandleFunc("/api/driver/update", h.UpdateDriverProfileHandler)

	http.HandleFunc("/api/driver/register", func(w http.ResponseWriter, r *http.Request) {
		h.RegisterDriverHandler(w, r, ctx, b)
	})
	// NEW: Add the intelligent search endpoint
	http.HandleFunc("/api/driver/search", h.GetDriverSearchHandler)

	http.HandleFunc("/api/driver/request", h.CreateDriverRequestHandler)
	http.HandleFunc("/api/client/requests", h.GetClientRequestsHandler)
	http.HandleFunc("/api/client/check", h.CheckClientHandler)
	http.HandleFunc("/api/client/request", func(w http.ResponseWriter, r *http.Request) {
		h.CreateClientRequestHandler(w, r, ctx, b)
	})
	http.HandleFunc("/api/driver/matching", h.GetMatchingDriversHandler)

	// File server for photos
	http.HandleFunc("/files/", h.FileServerHandler)

	// Serve static HTML files
	http.HandleFunc("/driver-register", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/driver-register.html")
	})

	http.HandleFunc("/driver-request", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/driver-request.html")
	})

	// ADD THIS LINE TOO
	http.HandleFunc("/driver-profile", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/driver-profile.html")
	})

	// ADD THIS DEBUG ROUTE
	http.HandleFunc("/debug-driver-profile", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/debug-driver-profile.html")
	})

	http.HandleFunc("/client", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/client.html")
	})

	http.HandleFunc("/welcome", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/welcome.html")
	})

	// Root handler
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		fmt.Fprint(w, "ZholDa Logistics Bot API")
	})

	h.logger.Info("Starting web server", zap.String("port", h.cfg.Port))
	if err := http.ListenAndServe(h.cfg.Port, nil); err != nil {
		h.logger.Fatal("Failed to start web server", zap.Error(err))
	}
}
