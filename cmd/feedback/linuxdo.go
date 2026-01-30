package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"database/sql"
	"net/http"
	"strings"
	"time"

	"golang.org/x/oauth2"
)

type LinuxDoUser struct {
	ID        string
	Username  string
	AvatarURL string
}

func (a *App) linuxDoConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     a.cfg.LinuxDoClientID,
		ClientSecret: a.cfg.LinuxDoClientSecret,
		RedirectURL:  strings.TrimRight(a.cfg.AppBaseURL, "/") + "/linux",
		Scopes:       []string{"openid", "profile"},
		Endpoint: oauth2.Endpoint{
			AuthURL:  a.cfg.LinuxDoAuthURL,
			TokenURL: a.cfg.LinuxDoTokenURL,
		},
	}
}

func (a *App) createOAuthState() (string, error) {
	var b [24]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b[:]), nil
}

func (a *App) setStateCookie(w http.ResponseWriter, state string) {
	http.SetCookie(w, &http.Cookie{
		Name:     stateCookieName,
		Value:    state,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   a.cfg.AppBaseURLHasTLS(),
		MaxAge:   10 * 60,
	})
}

func (a *App) readStateCookie(r *http.Request) string {
	c, err := r.Cookie(stateCookieName)
	if err != nil {
		return ""
	}
	return c.Value
}

func (a *App) clearStateCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     stateCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   a.cfg.AppBaseURLHasTLS(),
		MaxAge:   -1,
	})
}

func (a *App) fetchLinuxDoUser(ctx context.Context, accessToken string) (LinuxDoUser, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, a.cfg.LinuxDoUserinfoURL, nil)
	if err != nil {
		return LinuxDoUser{}, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return LinuxDoUser{}, err
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return LinuxDoUser{}, fmt.Errorf("Linux DO userinfo 获取失败: %s", res.Status)
	}

	var raw map[string]any
	if err := json.NewDecoder(res.Body).Decode(&raw); err != nil {
		return LinuxDoUser{}, err
	}

	getString := func(keys ...string) string {
		for _, k := range keys {
			if v, ok := raw[k]; ok {
				if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
					return s
				}
			}
		}
		return ""
	}

	id := getString("sub", "id", "user_id")
	username := getString("username", "name", "login")
	avatar := getString("avatar_url", "avatar")
	if id == "" || username == "" {
		b, _ := json.Marshal(raw)
		return LinuxDoUser{}, fmt.Errorf("Linux DO userinfo 字段不符合预期: %s", string(b))
	}

	return LinuxDoUser{ID: id, Username: username, AvatarURL: avatar}, nil
}

func (a *App) handleLogin(w http.ResponseWriter, r *http.Request) {
	if err := a.cfg.validateLinuxDo(); err != nil {
		a.renderError(w, r, http.StatusPreconditionFailed, err.Error())
		return
	}

	state, err := a.createOAuthState()
	if err != nil {
		a.renderError(w, r, http.StatusInternalServerError, "生成 state 失败")
		return
	}
	a.setStateCookie(w, state)

	u := a.linuxDoConfig().AuthCodeURL(state)
	http.Redirect(w, r, u, http.StatusFound)
}

func (a *App) handleLinuxCallback(w http.ResponseWriter, r *http.Request) {
	if err := a.cfg.validateLinuxDo(); err != nil {
		a.renderError(w, r, http.StatusPreconditionFailed, err.Error())
		return
	}

	q := r.URL.Query()
	code := strings.TrimSpace(q.Get("code"))
	state := strings.TrimSpace(q.Get("state"))
	if code == "" || state == "" {
		a.renderError(w, r, http.StatusBadRequest, "缺少 code/state")
		return
	}

	saved := a.readStateCookie(r)
	a.clearStateCookie(w)
	if saved == "" || saved != state {
		a.renderError(w, r, http.StatusBadRequest, "state 校验失败")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	tok, err := a.linuxDoConfig().Exchange(ctx, code)
	if err != nil {
		a.renderError(w, r, http.StatusBadGateway, "token 交换失败")
		return
	}

	access, ok := tok.Extra("access_token").(string)
	if !ok || access == "" {
		// oauth2 库通常会把 token.AccessToken 填好，但保险起见两边都尝试。
		access = tok.AccessToken
	}
	if access == "" {
		a.renderError(w, r, http.StatusBadGateway, "token 响应缺少 access_token")
		return
	}

	u, err := a.fetchLinuxDoUser(ctx, access)
	if err != nil {
		a.renderError(w, r, http.StatusBadGateway, err.Error())
		return
	}

	userID, err := a.upsertUserByLinuxDoID(ctx, u)
	if err != nil {
		a.renderError(w, r, http.StatusInternalServerError, "保存用户失败")
		return
	}

	old := a.readSession(r)
	a.writeSession(w, r, Session{UID: userID, IsAdmin: old.IsAdmin})
	http.Redirect(w, r, "/", http.StatusFound)
}

func (a *App) upsertUserByLinuxDoID(ctx context.Context, u LinuxDoUser) (string, error) {
	// 先查一下是否存在
	var id string
	err := a.db.QueryRowContext(ctx, `SELECT id FROM users WHERE linux_do_id = ?`, u.ID).Scan(&id)
	if err == nil && id != "" {
		_, _ = a.db.ExecContext(ctx, `UPDATE users SET username = ?, avatar_url = ? WHERE id = ?`, u.Username, nullIfEmpty(u.AvatarURL), id)
		return id, nil
	}
	if err != nil && err != sql.ErrNoRows {
		return "", err
	}

	id = newID()
	_, err = a.db.ExecContext(ctx,
		`INSERT INTO users(id, linux_do_id, username, avatar_url, created_at) VALUES(?,?,?,?,?)`,
		id, u.ID, u.Username, nullIfEmpty(u.AvatarURL), time.Now().Unix(),
	)
	if err != nil {
		return "", err
	}
	return id, nil
}

func nullIfEmpty(s string) any {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return s
}
