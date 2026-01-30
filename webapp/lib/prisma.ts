import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function mustGetDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("缺少 DATABASE_URL 环境变量");
  return url;
}

function createAdapter() {
  return new PrismaBetterSqlite3({ url: mustGetDatabaseUrl() });
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    adapter: createAdapter(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;
