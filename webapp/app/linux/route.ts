import { NextResponse } from "next/server";
import { exchangeLinuxDoToken, fetchLinuxDoUser, verifyLinuxDoState } from "@/lib/linuxdo";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) return NextResponse.redirect(new URL("/?login=missing_code", req.url));
  const ok = await verifyLinuxDoState(state);
  if (!ok) return NextResponse.redirect(new URL("/?login=bad_state", req.url));

  try {
    const accessToken = await exchangeLinuxDoToken(code);
    const linuxUser = await fetchLinuxDoUser(accessToken);

    const user = await prisma.user.upsert({
      where: { linuxDoId: linuxUser.id },
      create: {
        linuxDoId: linuxUser.id,
        username: linuxUser.username,
        avatarUrl: linuxUser.avatarUrl,
      },
      update: {
        username: linuxUser.username,
        avatarUrl: linuxUser.avatarUrl,
      },
    });

    await setSession({ uid: user.id });
    return NextResponse.redirect(new URL("/", req.url));
  } catch {
    return NextResponse.redirect(new URL("/?login=failed", req.url));
  }
}

