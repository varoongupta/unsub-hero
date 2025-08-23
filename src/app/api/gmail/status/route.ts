import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the user
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ connected: false });
    }

    // Check if user has any Gmail tokens
    const gmailToken = await prisma.gmailToken.findFirst({
      where: { userId: user.id }
    });

    return NextResponse.json({ connected: !!gmailToken });
  } catch (error) {
    console.error("Error checking Gmail status:", error);
    return NextResponse.json({ error: "Failed to check Gmail status" }, { status: 500 });
  }
}
