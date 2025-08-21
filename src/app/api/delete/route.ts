import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { makeOAuth, trashMessagesByFrom } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const fromEmails: string[] = Array.isArray(body.fromEmails) ? body.fromEmails : [];
  const query: string | undefined = typeof body.query === "string" ? body.query : undefined;
  if (fromEmails.length === 0) return NextResponse.json({ deletedCountBySender: {} });

  const authClient = await makeOAuth(userId);
  const deletedCountBySender = await trashMessagesByFrom(authClient, fromEmails, query);

  await Promise.all(
    Object.entries(deletedCountBySender).map(([fromEmail, count]) =>
      prisma.actionLog.create({
        data: {
          userId,
          action: "delete",
          sender: "",
          fromEmail,
          method: null,
          count,
        },
      })
    )
  ).catch(() => undefined);

  return NextResponse.json({ deletedCountBySender });
}


