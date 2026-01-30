package main

import (
	"embed"
	"html/template"
	"io"
	"net/http"
	"path"
	"strings"
	"time"
)

//go:embed web/templates/*.html web/static/*
var webFS embed.FS

func (a *App) initTemplates() {
	funcs := template.FuncMap{
		"nowYear": func() int { return time.Now().Year() },
		"md":      renderMarkdown,
	}

	a.tpl = template.Must(template.New("all").Funcs(funcs).ParseFS(webFS, "web/templates/*.html"))
}

type ViewData struct {
	Page string
	Title string

	Session Session
	User    *User

	PublicCount int64

	Query    string
	Feedback []Feedback

	Item    *Feedback
	Replies []Reply

	IsAuthed bool
	CanSee   bool

	FlashError string
}

func (a *App) render(w http.ResponseWriter, r *http.Request, page string, d ViewData) {
	if d.Page == "" {
		d.Page = strings.TrimSuffix(page, ".html")
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = a.tpl.ExecuteTemplate(w, page, d)
}

func (a *App) renderError(w http.ResponseWriter, r *http.Request, code int, msg string) {
	w.WriteHeader(code)
	a.render(w, r, "error.html", ViewData{
		Title:      "出错了",
		Session:    a.readSession(r),
		FlashError: msg,
	})
}

func (a *App) staticHandler() http.Handler {
	// 轻量静态文件：只提供我们 embed 的 CSS，路径固定 /static/xxx
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, file := path.Split(r.URL.Path)
		if file == "" {
			http.NotFound(w, r)
			return
		}
		f, err := webFS.Open("web/static/" + file)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		defer f.Close()

		if file == "app.css" {
			w.Header().Set("Content-Type", "text/css; charset=utf-8")
		}
		_, _ = io.Copy(w, f)
	})
}
