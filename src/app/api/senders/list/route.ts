import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { makeOAuth, listTopSenders } from "@/lib/gmail";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase();
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get("pageSize") || "25")));

  const authClient = await makeOAuth(userId);
  const all = await listTopSenders(authClient);
  const filtered = all.filter((s) =>
    q.length === 0 || s.from.toLowerCase().includes(q) || s.fromEmail.toLowerCase().includes(q)
  );
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const senders = filtered.slice(start, start + pageSize);
  return NextResponse.json({ senders, total });
}


