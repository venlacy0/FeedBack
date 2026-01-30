package main

import (
	"context"
	"database/sql"
	"net/http"
	"strings"
	"time"
)

func (a *App) handleHome(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	sess := a.readSession(r)
	user, _ := a.userByID(ctx, sess.UID)

	var cnt int64
	_ = a.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM feedbacks WHERE is_public = 1`).Scan(&cnt)

	a.render(w, r, "home.html", ViewData{
		Title:       "反馈站",
		Session:     sess,
		User:        user,
		IsAuthed:    sess.UID != "",
		PublicCount: cnt,
	})
}

func (a *App) handleLogout(w http.ResponseWriter, r *http.Request) {
	a.clearSession(w)
	http.Redirect(w, r, "/", http.StatusFound)
}

func (a *App) handleAdminPage(w http.ResponseWriter, r *http.Request) {
	sess := a.readSession(r)
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()
	user, _ := a.userByID(ctx, sess.UID)

	a.render(w, r, "admin.html", ViewData{
		Title:    "管理员",
		Session:  sess,
		User:     user,
		IsAuthed: sess.UID != "",
	})
}

func (a *App) handleAdminLogin(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		a.renderError(w, r, http.StatusBadRequest, "表单解析失败")
		return
	}
	key := strings.TrimSpace(r.FormValue("key"))
	if key == "" || key != a.cfg.AdminKey {
		http.Redirect(w, r, "/admin?bad=1", http.StatusFound)
		return
	}

	old := a.readSession(r)
	a.writeSession(w, r, Session{UID: old.UID, IsAdmin: true})
	http.Redirect(w, r, "/admin?ok=1", http.StatusFound)
}

func (a *App) handleSquare(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	sess := a.readSession(r)
	user, _ := a.userByID(ctx, sess.UID)

	q := strings.TrimSpace(r.URL.Query().Get("q"))

	where := `WHERE f.is_public = 1`
	args := []any{}
	if q != "" {
		where += ` AND (f.title LIKE ? OR f.content LIKE ?)`
		like := "%" + q + "%"
		args = append(args, like, like)
	}

	rows, err := a.db.QueryContext(ctx, `
		SELECT f.id, f.title, f.content, f.is_public, f.user_id, u.username, f.created_at, f.updated_at
		FROM feedbacks f
		JOIN users u ON u.id = f.user_id
	`+where+`
		ORDER BY f.created_at DESC
		LIMIT 50
	`, args...)
	if err != nil {
		a.renderError(w, r, http.StatusInternalServerError, "查询失败")
		return
	}
	defer rows.Close()

	var list []Feedback
	for rows.Next() {
		var f Feedback
		var isPublic int64
		var created, updated int64
		if err := rows.Scan(&f.ID, &f.Title, &f.Content, &isPublic, &f.UserID, &f.Username, &created, &updated); err != nil {
			continue
		}
		f.IsPublic = isPublic == 1
		f.CreatedAt = time.Unix(created, 0)
		f.UpdatedAt = time.Unix(updated, 0)
		list = append(list, f)
	}

	a.render(w, r, "square.html", ViewData{
		Title:    "反馈广场",
		Session:  sess,
		User:     user,
		IsAuthed: sess.UID != "",
		Query:    q,
		Feedback: list,
	})
}

func (a *App) handleSquareDetail(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		http.NotFound(w, r)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	sess := a.readSession(r)
	user, _ := a.userByID(ctx, sess.UID)

	item, err := a.feedbackByID(ctx, id)
	if err == sql.ErrNoRows {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		a.renderError(w, r, http.StatusInternalServerError, "查询失败")
		return
	}

	canSee := item.IsPublic || sess.IsAdmin || (sess.UID != "" && sess.UID == item.UserID)
	if !canSee {
		http.NotFound(w, r)
		return
	}

	replies, _ := a.repliesByFeedbackID(ctx, id)
	replyErr := r.URL.Query().Get("reply_error") == "1"

	a.render(w, r, "detail.html", ViewData{
		Title:      item.Title,
		Session:    sess,
		User:       user,
		IsAuthed:   sess.UID != "",
		CanSee:     canSee,
		Item:       item,
		Replies:    replies,
		FlashError: func() string { if replyErr { return "回复提交失败：内容不能为空且长度需合理。" }; return "" }(),
	})
}

func (a *App) handleCreateReply(w http.ResponseWriter, r *http.Request) {
	sess := a.readSession(r)
	if !sess.IsAdmin {
		http.NotFound(w, r)
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		http.NotFound(w, r)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Redirect(w, r, "/square/"+id+"?reply_error=1", http.StatusFound)
		return
	}

	content := strings.TrimSpace(r.FormValue("content"))
	if content == "" || len(content) > 20000 {
		http.Redirect(w, r, "/square/"+id+"?reply_error=1", http.StatusFound)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// 权限：如果反馈不存在/不可见，直接 404
	item, err := a.feedbackByID(ctx, id)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	if !item.IsPublic && !(sess.UID != "" && sess.UID == item.UserID) && !sess.IsAdmin {
		http.NotFound(w, r)
		return
	}

	adminUserID := nullIfEmpty(sess.UID)
	_, err = a.db.ExecContext(ctx,
		`INSERT INTO replies(id, content, created_at, feedback_id, admin_user_id) VALUES(?,?,?,?,?)`,
		newID(), content, time.Now().Unix(), id, adminUserID,
	)
	if err != nil {
		http.Redirect(w, r, "/square/"+id+"?reply_error=1", http.StatusFound)
		return
	}

	http.Redirect(w, r, "/square/"+id, http.StatusFound)
}

func (a *App) handleNewFeedbackForm(w http.ResponseWriter, r *http.Request) {
	sess := a.readSession(r)
	if sess.UID == "" {
		http.Redirect(w, r, "/login", http.StatusFound)
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()
	user, _ := a.userByID(ctx, sess.UID)

	a.render(w, r, "new.html", ViewData{
		Title:    "写反馈",
		Session:  sess,
		User:     user,
		IsAuthed: true,
	})
}

func (a *App) handleCreateFeedback(w http.ResponseWriter, r *http.Request) {
	sess := a.readSession(r)
	if sess.UID == "" {
		http.Redirect(w, r, "/login", http.StatusFound)
		return
	}

	if err := r.ParseForm(); err != nil {
		a.renderError(w, r, http.StatusBadRequest, "表单解析失败")
		return
	}

	title := strings.TrimSpace(r.FormValue("title"))
	content := strings.TrimSpace(r.FormValue("content"))
	isPublic := strings.TrimSpace(r.FormValue("is_public")) != "0"

	if title == "" || len(title) > 200 || content == "" || len(content) > 20000 {
		a.renderError(w, r, http.StatusBadRequest, "标题/内容长度不合法")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	now := time.Now().Unix()
	id := newID()
	_, err := a.db.ExecContext(ctx,
		`INSERT INTO feedbacks(id, title, content, is_public, created_at, updated_at, user_id) VALUES(?,?,?,?,?,?,?)`,
		id, title, content, boolToInt(isPublic), now, now, sess.UID,
	)
	if err != nil {
		a.renderError(w, r, http.StatusInternalServerError, "写入失败")
		return
	}

	http.Redirect(w, r, "/square/"+id, http.StatusFound)
}

func (a *App) handleMyFeedback(w http.ResponseWriter, r *http.Request) {
	sess := a.readSession(r)
	if sess.UID == "" {
		http.Redirect(w, r, "/login", http.StatusFound)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	user, _ := a.userByID(ctx, sess.UID)

	rows, err := a.db.QueryContext(ctx, `
		SELECT f.id, f.title, f.content, f.is_public, f.user_id, u.username, f.created_at, f.updated_at
		FROM feedbacks f
		JOIN users u ON u.id = f.user_id
		WHERE f.user_id = ?
		ORDER BY f.created_at DESC
		LIMIT 100
	`, sess.UID)
	if err != nil {
		a.renderError(w, r, http.StatusInternalServerError, "查询失败")
		return
	}
	defer rows.Close()

	var list []Feedback
	for rows.Next() {
		var f Feedback
		var isPublic int64
		var created, updated int64
		if err := rows.Scan(&f.ID, &f.Title, &f.Content, &isPublic, &f.UserID, &f.Username, &created, &updated); err != nil {
			continue
		}
		f.IsPublic = isPublic == 1
		f.CreatedAt = time.Unix(created, 0)
		f.UpdatedAt = time.Unix(updated, 0)
		list = append(list, f)
	}

	a.render(w, r, "me.html", ViewData{
		Title:    "我的反馈",
		Session:  sess,
		User:     user,
		IsAuthed: true,
		Feedback: list,
	})
}

func (a *App) userByID(ctx context.Context, id string) (*User, error) {
	if strings.TrimSpace(id) == "" {
		return nil, sql.ErrNoRows
	}
	var u User
	var avatar sql.NullString
	var created int64
	err := a.db.QueryRowContext(ctx,
		`SELECT id, linux_do_id, username, avatar_url, created_at FROM users WHERE id = ?`,
		id,
	).Scan(&u.ID, &u.LinuxDoID, &u.Username, &avatar, &created)
	if err != nil {
		return nil, err
	}
	if avatar.Valid {
		u.AvatarURL = avatar.String
	}
	u.CreatedAt = time.Unix(created, 0)
	return &u, nil
}

func (a *App) feedbackByID(ctx context.Context, id string) (*Feedback, error) {
	var f Feedback
	var isPublic int64
	var created, updated int64
	err := a.db.QueryRowContext(ctx, `
		SELECT f.id, f.title, f.content, f.is_public, f.user_id, u.username, f.created_at, f.updated_at
		FROM feedbacks f
		JOIN users u ON u.id = f.user_id
		WHERE f.id = ?
	`, id).Scan(&f.ID, &f.Title, &f.Content, &isPublic, &f.UserID, &f.Username, &created, &updated)
	if err != nil {
		return nil, err
	}
	f.IsPublic = isPublic == 1
	f.CreatedAt = time.Unix(created, 0)
	f.UpdatedAt = time.Unix(updated, 0)
	return &f, nil
}

func (a *App) repliesByFeedbackID(ctx context.Context, feedbackID string) ([]Reply, error) {
	rows, err := a.db.QueryContext(ctx, `
		SELECT r.id, r.content, r.created_at, COALESCE(u.username, '')
		FROM replies r
		LEFT JOIN users u ON u.id = r.admin_user_id
		WHERE r.feedback_id = ?
		ORDER BY r.created_at ASC
	`, feedbackID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Reply
	for rows.Next() {
		var it Reply
		var created int64
		if err := rows.Scan(&it.ID, &it.Content, &created, &it.AdminUsername); err != nil {
			continue
		}
		it.CreatedAt = time.Unix(created, 0)
		list = append(list, it)
	}
	return list, nil
}

func boolToInt(b bool) int64 {
	if b {
		return 1
	}
	return 0
}

