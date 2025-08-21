import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get("pageSize") || "25")));
  const where: { userId: string; action?: string } = { userId };
  if (type) where.action = type;
  const total = await prisma.actionLog.count({ where });
  const items = await prisma.actionLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  console.log("History API returning items:", items); // Debug log
  return NextResponse.json({ items, total });
}


