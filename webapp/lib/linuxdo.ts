import { cookies } from "next/headers";

const STATE_COOKIE = "linuxdo_oauth_state";

export type LinuxDoUser = {
  id: string;
  username: string;
  avatarUrl?: string;
};

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`缺少 ${name} 环境变量`);
  return v;
}

export async function createLinuxDoAuthRedirect() {
  const authUrl = getEnv("LINUXDO_AUTH_URL");
  const clientId = getEnv("LINUXDO_CLIENT_ID");
  const appBaseUrl = getEnv("APP_BASE_URL").replace(/\/+$/, "");

  const state = crypto.randomUUID();
  const jar = await cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  const url = new URL(authUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${appBaseUrl}/linux`);
  url.searchParams.set("state", state);
  // scope 以平台实际为准；这里给一个相对通用的默认值
  url.searchParams.set("scope", "openid profile");

  return url.toString();
}

export async function verifyLinuxDoState(state: string | null): Promise<boolean> {
  if (!state) return false;
  const jar = await cookies();
  const saved = jar.get(STATE_COOKIE)?.value;
  return !!saved && saved === state;
}

export async function exchangeLinuxDoToken(code: string): Promise<string> {
  const tokenUrl = getEnv("LINUXDO_TOKEN_URL");
  const clientId = getEnv("LINUXDO_CLIENT_ID");
  const clientSecret = getEnv("LINUXDO_CLIENT_SECRET");
  const appBaseUrl = getEnv("APP_BASE_URL").replace(/\/+$/, "");

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("redirect_uri", `${appBaseUrl}/linux`);

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Linux DO token 交换失败: ${res.status} ${txt}`);
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Linux DO token 响应缺少 access_token");
  return json.access_token;
}

export async function fetchLinuxDoUser(accessToken: string): Promise<LinuxDoUser> {
  const userinfoUrl = getEnv("LINUXDO_USERINFO_URL");
  const res = await fetch(userinfoUrl, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Linux DO userinfo 获取失败: ${res.status} ${txt}`);
  }

  const raw = (await res.json()) as Record<string, unknown>;
  const id =
    (typeof raw.sub === "string" && raw.sub) ||
    (typeof raw.id === "string" && raw.id) ||
    (typeof raw.user_id === "string" && raw.user_id) ||
    "";
  const username =
    (typeof raw.username === "string" && raw.username) ||
    (typeof raw.name === "string" && raw.name) ||
    (typeof raw.login === "string" && raw.login) ||
    "";
  const avatarUrl =
    (typeof raw.avatar_url === "string" && raw.avatar_url) ||
    (typeof raw.avatar === "string" && raw.avatar) ||
    undefined;

  if (!id || !username) {
    throw new Error(`Linux DO userinfo 字段不符合预期: ${JSON.stringify(raw)}`);
  }

  return { id, username, avatarUrl };
}

