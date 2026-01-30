import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/?need_login=1");

  const list = await prisma.feedback.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
            我的反馈
          </h1>
          <p className="mt-2 text-sm text-zinc-700">
            你写过的公开/私有反馈都在这儿。
          </p>
        </div>
        <Link
          href="/new"
          className="shrink-0 inline-flex items-center justify-center rounded-xl bg-teal-900 px-4 py-2 text-sm font-medium text-[var(--surface)] shadow-sm shadow-teal-900/20 hover:bg-teal-950"
        >
          写反馈
        </Link>
      </div>

      <section className="grid gap-3">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200/80 bg-[var(--surface)] p-7 text-sm text-zinc-700 shadow-sm shadow-zinc-900/5">
            你还没写过反馈。要不现在写一条？
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
                    {f.isPublic ? "公开" : "私有"}
                  </div>
                  <div>{new Date(f.createdAt).toLocaleString("zh-CN")}</div>
                </div>
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}

