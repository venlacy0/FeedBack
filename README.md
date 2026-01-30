这个目录里实际可运行的站点项目在 `webapp/`。

进入并启动：

```bash
cd webapp
npm install
npx prisma migrate dev
npm run dev
```

Docker Compose 启动：

```bash
docker compose up --build
```
