package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

const (
	sessionCookieName = "fs_session"
	stateCookieName   = "linuxdo_oauth_state"
)

type Session struct {
	UID     string `json:"uid,omitempty"`
	IsAdmin bool   `json:"isAdmin,omitempty"`
	Exp     int64  `json:"exp"`
}

func (a *App) readSession(r *http.Request) Session {
	c, err := r.Cookie(sessionCookieName)
	if err != nil {
		return Session{}
	}

	parts := strings.SplitN(c.Value, ".", 2)
	if len(parts) != 2 {
		return Session{}
	}

	payloadB, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return Session{}
	}

	sigB, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return Session{}
	}

	mac := hmac.New(sha256.New, a.cfg.SessionSecret)
	_, _ = mac.Write(payloadB)
	if !hmac.Equal(sigB, mac.Sum(nil)) {
		return Session{}
	}

	var s Session
	if err := json.Unmarshal(payloadB, &s); err != nil {
		return Session{}
	}
	if s.Exp <= time.Now().Unix() {
		return Session{}
	}
	return s
}

func (a *App) writeSession(w http.ResponseWriter, r *http.Request, s Session) {
	if s.Exp == 0 {
		s.Exp = time.Now().Add(30 * 24 * time.Hour).Unix()
	}

	payloadB, _ := json.Marshal(s)
	mac := hmac.New(sha256.New, a.cfg.SessionSecret)
	_, _ = mac.Write(payloadB)
	sig := mac.Sum(nil)

	val := base64.RawURLEncoding.EncodeToString(payloadB) + "." + base64.RawURLEncoding.EncodeToString(sig)

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    val,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   a.cfg.AppBaseURLHasTLS(),
		MaxAge:   int(30 * 24 * time.Hour / time.Second),
	})
}

func (a *App) clearSession(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   a.cfg.AppBaseURLHasTLS(),
		MaxAge:   -1,
	})
}

func (c Config) AppBaseURLHasTLS() bool {
	return strings.HasPrefix(strings.ToLower(c.AppBaseURL), "https://")
}
