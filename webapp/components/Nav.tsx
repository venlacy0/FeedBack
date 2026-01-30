import Link from "next/link";
import { getSession } from "@/lib/session";

export async function Nav() {
  const session = await getSession();
  const isAuthed = !!session.uid;

  return (
    <header className="border-b border-zinc-200/70 bg-[var(--surface)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 font-semibold tracking-tight text-zinc-900"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal-900 text-[var(--surface)]">
            F
          </span>
          反馈站
        </Link>

        <nav className="flex items-center gap-4 text-sm text-zinc-700">
          <Link className="hover:text-zinc-950" href="/square">
            反馈广场
          </Link>
          {isAuthed ? (
            <>
              <Link className="hover:text-zinc-950" href="/new">
                写反馈
              </Link>
              <Link className="hover:text-zinc-950" href="/me">
                我的反馈
              </Link>
              <Link className="hover:text-zinc-950" href="/logout">
                退出
              </Link>
            </>
          ) : (
            <Link className="hover:text-zinc-950" href="/login">
              登录
            </Link>
          )}
          <Link className="hover:text-zinc-950" href="/admin">
            管理员
          </Link>
        </nav>
      </div>
    </header>
  );
}

