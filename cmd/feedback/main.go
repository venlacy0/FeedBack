package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"
)

func main() {
	cfg := mustLoadConfig()

	db, err := openDB(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("打开数据库失败: %v", err)
	}
	defer db.Close()

	if err := ensureSchema(db); err != nil {
		log.Fatalf("初始化数据库结构失败: %v", err)
	}

	app := &App{
		cfg: cfg,
		db:  db,
	}
	app.initTemplates()

	mux := http.NewServeMux()
	mux.Handle("/static/", app.staticHandler())

	mux.HandleFunc("GET /", app.handleHome)
	mux.HandleFunc("GET /square", app.handleSquare)
	mux.HandleFunc("GET /square/{id}", app.handleSquareDetail)
	mux.HandleFunc("POST /square/{id}/reply", app.handleCreateReply)

	mux.HandleFunc("GET /new", app.handleNewFeedbackForm)
	mux.HandleFunc("POST /new", app.handleCreateFeedback)
	mux.HandleFunc("GET /me", app.handleMyFeedback)

	mux.HandleFunc("GET /login", app.handleLogin)
	mux.HandleFunc("GET /linux", app.handleLinuxCallback)
	mux.HandleFunc("GET /logout", app.handleLogout)

	mux.HandleFunc("GET /admin", app.handleAdminPage)
	mux.HandleFunc("POST /admin", app.handleAdminLogin)

	server := &http.Server{
		Addr:              cfg.ListenAddr,
		Handler:           app.withMiddleware(mux),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("启动: http://%s", cfg.ListenAddr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("服务退出: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}

func mustLoadConfig() Config {
	cfg, err := loadConfig()
	if err != nil {
		log.Fatal(err)
	}
	return cfg
}

func newID() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

func mustInt64(s string) int64 {
	v, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		panic(fmt.Sprintf("bad int64: %q", s))
	}
	return v
}

