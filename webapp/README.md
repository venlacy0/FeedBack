# 反馈站点

一个极简的反馈收集站：

- 使用 Linux DO Connect 登录（OAuth2），回调地址固定为 `/linux`
- 登录后写反馈：公开反馈进入「反馈广场」，所有人可查看 + 模糊搜索；私有反馈仅作者 + 管理员可见
- 反馈正文支持 Markdown（已做基础 XSS 清理）
- 管理员入口：输入密钥进入管理员面板（默认密钥：`gCM61tTRDmGc1zGU4o2R`）
- 管理员可在反馈详情页回复用户（支持 Markdown），回复会显示在该反馈下方

## 本地启动

在 `C:\Users\zh301\Desktop\反馈站点\webapp` 目录下：

```bash
npm install
npx prisma migrate dev
npm run dev
```

打开 `http://localhost:3000`

## Docker / Docker Compose

直接使用根目录的 `docker-compose.yml`：

```bash
docker compose up --build
```

默认会把 SQLite 数据库放到 volume（`feedback_data`）里，避免容器重建丢数据。
默认对外端口为 `80`，启动后直接访问 `http://localhost`。

注意：

- `APP_BASE_URL` 必须是外部可访问的站点地址（用于生成 OAuth redirect_uri：`${APP_BASE_URL}/linux`）
- `SESSION_SECRET` 必须改成足够长的随机串
- Linux DO Connect 的 `CLIENT_ID/SECRET` 请按平台后台配置填写

## 环境变量

复制 `.env.example` 为 `.env`，并至少配置：

- `SESSION_SECRET`：用于签名 Cookie（请换成长随机串）
- `LINUXDO_CLIENT_ID` / `LINUXDO_CLIENT_SECRET`：Linux DO Connect 的 OAuth2 凭证
- `APP_BASE_URL`：站点基础地址（例如 `http://localhost:3000`）

Linux DO Connect 的回调地址（redirect_uri）会固定使用：

```
${APP_BASE_URL}/linux
```

## 我已经帮你初始化好的配置

- `webapp/.env`：本地开发可直接用（已生成随机 `SESSION_SECRET`）
- `webapp/.env.docker`：给 `docker-compose.yml` 用（同样已生成随机 `SESSION_SECRET`）
- 数据库迁移已就绪：`npx prisma migrate dev` / 容器启动时会跑 `npx prisma migrate deploy`

你现在只需要补上 Linux DO Connect 的：

- `LINUXDO_CLIENT_ID`
- `LINUXDO_CLIENT_SECRET`
- 以及把 `APP_BASE_URL` 改成你实际对外访问的地址（本地就保持 `http://localhost:3000`）

## 目录结构（关键）

- `app/`：Next.js App Router 页面与路由（包含 `/linux`、`/login`、`/logout`）
- `app/square/[id]/actions.ts`：管理员回复的 server action
- `prisma/`：数据模型与迁移
- `lib/`：会话、Linux DO OAuth、Prisma 单例
- `components/`：导航、Markdown 渲染、SVG 图标
