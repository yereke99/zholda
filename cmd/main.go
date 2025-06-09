// cmd/main.go
package main

import (
	"context"
	"database/sql"
	"os"
	"os/signal"
	"zholda/config"
	"zholda/internal/handler"
	"zholda/internal/repository"
	"zholda/traits/logger"

	"github.com/go-telegram/bot"
	_ "github.com/mattn/go-sqlite3"
	"go.uber.org/zap"
)

// createTables creates all necessary tables if they don't exist
func createTables(db *sql.DB) error {
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

func main() {
	zapLogger, err := logger.NewLogger()
	if err != nil {
		panic(err)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()

	cfg, err := config.NewConfig()
	if err != nil {
		zapLogger.Error("error init config", zap.Error(err))
		return
	}

	// Initialize SQLite database
	db, err := sql.Open("sqlite3", "./zholda.db")
	if err != nil {
		zapLogger.Fatal("Failed to open database", zap.Error(err))
	}
	defer db.Close()

	// Create tables if not exists
	if err := createTables(db); err != nil {
		zapLogger.Fatal("Failed to create tables", zap.Error(err))
	}

	// Initialize repositories
	driverRepo := repository.NewDriverRepository(db)
	clientRepo := repository.NewClientRepository(db)

	// Initialize handler
	h := handler.NewHandler(driverRepo, clientRepo, zapLogger, cfg)

	// Initialize bot
	opts := []bot.Option{
		bot.WithDefaultHandler(h.StartHandler),
	}

	b, err := bot.New(cfg.Token, opts...)
	if err != nil {
		zapLogger.Error("error creating bot", zap.Error(err))
		return
	}

	// Start web server in goroutine
	go h.StartWebServer(ctx, b)

	zapLogger.Info("Bot started successfully")
	b.Start(ctx)
}
