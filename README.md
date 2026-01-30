这个仓库已经用 Go 以更轻量的方式重构（不再依赖容器化部署 / Node / Prisma）。

## 启动

1) 配置环境变量

复制 `.env.example`，把关键项填好（至少 `SESSION_SECRET`）：

```bash
cp .env.example .env
set -a; . ./.env; set +a
```

2) 运行

```bash
go run ./cmd/feedback
```

默认监听 `127.0.0.1:3000`，打开 `http://localhost:3000`。

## Linux DO Connect 回调地址

固定填：

```
${APP_BASE_URL}/linux
```

## 目录说明

- `cmd/feedback/`：Go 服务端（SQLite + OAuth2 + 会话 Cookie + Markdown 渲染）
- `cmd/feedback/web/`：HTML 模板与静态资源（已 embed 到二进制里）
