import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { makeOAuth, performUnsub } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const items: Array<{ listUnsub: string; sender: string; fromEmail: string }> = Array.isArray(body.items) ? body.items : [];
  console.log("Received unsubscribe request:", { userId, items }); // Debug log
  if (items.length === 0) return NextResponse.json({ results: [] });

  const authClient = await makeOAuth(userId);
  const results: Array<{ listUnsub: string; ok: boolean; method: "http" | "mailto" | null }> = [];

  for (const item of items) {
    const res = await performUnsub(authClient, item.listUnsub);
    results.push({ listUnsub: item.listUnsub, ok: res.ok, method: res.method });
    try {
      console.log("Creating action log for:", { sender: item.sender, fromEmail: item.fromEmail, method: res.method }); // Debug log
      await prisma.actionLog.create({
        data: {
          userId: userId,
          action: "unsubscribe",
          sender: item.sender || item.fromEmail, // Fallback to fromEmail if sender is empty
          fromEmail: item.fromEmail,
          method: res.method ?? null,
          count: 1,
        },
      });
      console.log("Action log created successfully"); // Debug log
    } catch (error) {
      console.error("Failed to create action log:", error); // Debug log
    }
    await sleep(120); // ~8-10/sec
  }

  return NextResponse.json({ results });
}


