import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "fs_session";

type SessionPayload = {
  uid?: string;
  isAdmin?: boolean;
};

function mustGetSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("缺少 SESSION_SECRET 环境变量");
  return new TextEncoder().encode(secret);
}

export async function setSession(payload: SessionPayload) {
  const secret = mustGetSecret();
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionPayload> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return {};

  try {
    const secret = mustGetSecret();
    const { payload } = await jwtVerify(token, secret);
    return {
      uid: typeof payload.uid === "string" ? payload.uid : undefined,
      isAdmin: payload.isAdmin === true,
    };
  } catch {
    return {};
  }
}

