import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.uid) return null;
  return prisma.user.findUnique({ where: { id: session.uid } });
}

