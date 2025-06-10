// cmd/main.go
package main

import (
	"context"
	"database/sql"
	"os"
	"os/signal"
	"syscall"
	"zholda/config"
	"zholda/internal/handler"
	"zholda/internal/repository"
	"zholda/traits/database"
	"zholda/traits/logger"

	"github.com/go-telegram/bot"
	_ "github.com/mattn/go-sqlite3"
	"go.uber.org/zap"
)

func main() {
	zapLogger, err := logger.NewLogger()
	if err != nil {
		panic(err)
	}

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
	if err := database.CreateTables(db); err != nil {
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

	ctx, cancel := context.WithCancel(context.Background())
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGTERM, syscall.SIGINT)
	go func() {
		<-stop
		zapLogger.Info("Bot stoppped successfully")
		cancel()
	}()

	// Start web server in goroutine
	go h.StartWebServer(ctx, b)

	b.Start(ctx)
	zapLogger.Info("Bot started successfully")
}
