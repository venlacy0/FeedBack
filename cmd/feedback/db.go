package main

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

func openDB(path string) (*sql.DB, error) {
	// modernc sqlite DSN 走 file: 前缀最稳。
	dsn := fmt.Sprintf("file:%s?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)", path)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1) // SQLite 单连接更省心
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(0)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}

func ensureSchema(db *sql.DB) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			linux_do_id TEXT NOT NULL UNIQUE,
			username TEXT NOT NULL,
			avatar_url TEXT,
			created_at INTEGER NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS feedbacks (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			content TEXT NOT NULL,
			is_public INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			user_id TEXT NOT NULL
		);`,
		`CREATE INDEX IF NOT EXISTS idx_feedbacks_public_created ON feedbacks(is_public, created_at);`,
		`CREATE INDEX IF NOT EXISTS idx_feedbacks_user_created ON feedbacks(user_id, created_at);`,
		`CREATE TABLE IF NOT EXISTS replies (
			id TEXT PRIMARY KEY,
			content TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			feedback_id TEXT NOT NULL,
			admin_user_id TEXT
		);`,
		`CREATE INDEX IF NOT EXISTS idx_replies_feedback_created ON replies(feedback_id, created_at);`,
	}

	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			return err
		}
	}
	return nil
}

type User struct {
	ID        string
	LinuxDoID string
	Username  string
	AvatarURL string
	CreatedAt time.Time
}

type Feedback struct {
	ID        string
	Title     string
	Content   string
	IsPublic  bool
	UserID    string
	Username  string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Reply struct {
	ID            string
	Content       string
	CreatedAt     time.Time
	AdminUsername string
}

