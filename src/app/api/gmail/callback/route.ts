import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOAuthClient } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";
import { encryptToBase64 } from "@/lib/crypto";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", process.env.APP_URL || "http://localhost:3000"));
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const oauth2 = getOAuthClient();
  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);

  const accessToken = tokens.access_token || "";
  const refreshToken = tokens.refresh_token || "";
  const expiryDateMs = tokens.expiry_date || Date.now() + 3600 * 1000;
  const scope = tokens.scope || "";

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    create: { clerkId: userId, email: `${userId}@unknown.local` },
    update: {},
  });

  await prisma.gmailToken.create({
    data: {
      userId: user.id,
      accessToken: await encryptToBase64(accessToken),
      refreshToken: await encryptToBase64(refreshToken),
      expiryDate: new Date(expiryDateMs),
      scope,
    },
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  return NextResponse.redirect(`${appUrl}/dashboard`);
}


