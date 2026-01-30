package main

import (
	"errors"
	"fmt"
	"os"
	"strings"
)

type Config struct {
	ListenAddr   string
	DatabasePath string

	SessionSecret []byte
	AdminKey      string

	AppBaseURL string

	LinuxDoClientID     string
	LinuxDoClientSecret string

	LinuxDoAuthURL     string
	LinuxDoTokenURL    string
	LinuxDoUserinfoURL string
}

func loadConfig() (Config, error) {
	get := func(name string) string { return strings.TrimSpace(os.Getenv(name)) }

	listen := get("LISTEN_ADDR")
	if listen == "" {
		listen = "127.0.0.1:3000"
	}

	dbPath := get("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "./data.db"
	}

	secret := get("SESSION_SECRET")
	if secret == "" {
		return Config{}, errors.New("缺少 SESSION_SECRET 环境变量（建议用 32+ 字符随机串）")
	}

	adminKey := get("ADMIN_KEY")
	if adminKey == "" {
		adminKey = "gCM61tTRDmGc1zGU4o2R"
	}

	base := strings.TrimRight(get("APP_BASE_URL"), "/")
	if base == "" {
		base = "http://localhost:3000"
	}

	cfg := Config{
		ListenAddr:    listen,
		DatabasePath:  dbPath,
		SessionSecret: []byte(secret),
		AdminKey:      adminKey,
		AppBaseURL:    base,

		LinuxDoClientID:     get("LINUXDO_CLIENT_ID"),
		LinuxDoClientSecret: get("LINUXDO_CLIENT_SECRET"),
		LinuxDoAuthURL:      get("LINUXDO_AUTH_URL"),
		LinuxDoTokenURL:     get("LINUXDO_TOKEN_URL"),
		LinuxDoUserinfoURL:  get("LINUXDO_USERINFO_URL"),
	}

	// OAuth 相关字段允许为空：这样可以在不开登录的情况下先跑起来看页面。
	return cfg, nil
}

func (c Config) linuxDoEnabled() bool {
	return c.LinuxDoClientID != "" &&
		c.LinuxDoClientSecret != "" &&
		c.LinuxDoAuthURL != "" &&
		c.LinuxDoTokenURL != "" &&
		c.LinuxDoUserinfoURL != ""
}

func (c Config) validateLinuxDo() error {
	if c.linuxDoEnabled() {
		return nil
	}
	return fmt.Errorf("Linux DO Connect 未配置完整：需要 LINUXDO_CLIENT_ID/SECRET + LINUXDO_AUTH_URL/TOKEN_URL/USERINFO_URL")
}

