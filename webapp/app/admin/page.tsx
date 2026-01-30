import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { adminLogin } from "@/app/admin/actions";
import { IconSearch } from "@/components/icons";

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ bad?: string; q?: string; scope?: string }>;
}) {
  const session = await getSession();
  const isAdmin = session.isAdmin === true;

  if (!isAdmin) {
    const sp = (await searchParams) ?? {};
    const bad = sp.bad === "1";
    return (
      <div className="grid gap-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
            管理员入口
          </h1>
          <p className="mt-2 text-sm text-zinc-700">
            输入密钥进入管理员面板。进入后可查看所有反馈（含私有）。
          </p>
        </div>

        {bad ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
            密钥不正确。
          </div>
        ) : null}

        <form
          action={adminLogin}
          className="grid gap-4 rounded-2xl border border-zinc-200/80 bg-[var(--surface)] p-7 shadow-sm shadow-zinc-900/5"
        >
          <label className="grid gap-2">
            <span className="text-sm font-medium text-zinc-900">管理员密钥</span>
            <input
              name="key"
              type="password"
              placeholder="输入密钥"
              className="rounded-xl border border-zinc-200 bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-teal-900"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-teal-900 px-5 py-2.5 text-sm font-medium text-[var(--surface)] shadow-sm shadow-teal-900/20 hover:bg-teal-950"
          >
            进入面板
          </button>
        </form>
      </div>
    );
  }

  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const scope =
    sp.scope === "public" || sp.scope === "private" ? sp.scope : "all";

  const where: Prisma.FeedbackWhereInput = {};
  if (scope === "public") where.isPublic = true;
  if (scope === "private") where.isPublic = false;
  if (q) where.OR = [{ title: { contains: q } }, { content: { contains: q } }];

  const list = await prisma.feedback.findMany({
    where,
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
          管理员面板
        </h1>
        <p className="text-sm text-zinc-700">
          你现在拥有管理员视角：可查看所有反馈（含私有）。
        </p>
      </div>

      <form
        action="/admin"
        method="get"
        className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-[var(--surface)] p-5 shadow-sm shadow-zinc-900/5 md:flex-row md:items-center"
      >
        <label className="flex flex-1 items-center gap-3 rounded-xl border border-zinc-200 bg-[var(--surface)] px-4 py-2 text-sm text-zinc-700 focus-within:border-teal-900">
          <IconSearch className="h-4 w-4 text-zinc-500" />
          <input
            name="q"
            defaultValue={q}
            placeholder="搜标题或正文"
            className="w-full bg-transparent outline-none placeholder:text-zinc-400"
          />
        </label>
        <select
          name="scope"
          defaultValue={scope}
          className="rounded-xl border border-zinc-200 bg-[var(--surface)] px-3 py-2 text-sm text-zinc-800 outline-none focus:border-teal-900"
        >
          <option value="all">全部</option>
          <option value="public">公开</option>
          <option value="private">私有</option>
        </select>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-teal-900 px-4 py-2 text-sm font-medium text-[var(--surface)] shadow-sm shadow-teal-900/20 hover:bg-teal-950"
        >
          筛选/搜索
        </button>
      </form>

      <section className="grid gap-3">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200/80 bg-[var(--surface)] p-7 text-sm text-zinc-700 shadow-sm shadow-zinc-900/5">
            暂无结果。
          </div>
        ) : (
          list.map((f) => (
            <Link
              key={f.id}
              href={`/square/${f.id}`}
              className="rounded-2xl border border-zinc-200/80 bg-[var(--surface)] p-6 shadow-sm shadow-zinc-900/5 hover:border-zinc-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-zinc-950">
                    {f.title}
                  </div>
                  <div className="mt-2 line-clamp-2 text-sm leading-7 text-zinc-700">
                    {f.content}
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-zinc-600">
                  <div className="font-medium text-zinc-800">
                    {f.isPublic ? "公开" : "私有"} · {f.user.username}
                  </div>
                  <div>{new Date(f.createdAt).toLocaleString("zh-CN")}</div>
                </div>
              </div>
            </Link>
          ))
        )}
      </section>

      <div className="text-xs text-zinc-600">
        想退出管理员状态的话：直接点导航栏「退出」，会清掉 Cookie。
      </div>
    </div>
  );
}
