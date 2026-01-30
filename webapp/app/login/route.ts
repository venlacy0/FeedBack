import { NextResponse } from "next/server";
import { createLinuxDoAuthRedirect } from "@/lib/linuxdo";

export async function GET() {
  const url = await createLinuxDoAuthRedirect();
  return NextResponse.redirect(url);
}

