package main

import (
	"database/sql"
	"html/template"
	"net/http"
)

type App struct {
	cfg Config
	db  *sql.DB

	tpl *template.Template
}

func (a *App) withMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 一些很基础的安全 Header，避免误伤，不搞花里胡哨。
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "same-origin")
		next.ServeHTTP(w, r)
	})
}

