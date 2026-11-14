import "server-only";

import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { connectMongoose } from "@/server/db/mongoose";
import { AdminStepUpTokenModel, type AdminStepUpAction } from "@/server/db/models/AdminStepUpToken";
import type { SessionContext } from "@/server/auth/guards";
import { verifyTestIdentity } from "@/server/auth/test-identity";
import { siteConfig } from "@/config/site";

export const ADMIN_STEP_UP_COOKIE = "bb_admin_step_up";
const STEP_UP_TTL_MS = 5 * 60 * 1000;

export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(siteConfig.url).origin;
  } catch {
    return false;
  }
}

/**
 * Returns true when the request carries a valid Playwright test identity.
 * The Host header is NOT consulted: a tunnel can spoof it. The only control
 * is the shared secret injected by the Playwright runner.
 */
export async function isPlaywrightTestRequest(request: NextRequest): Promise<boolean> {
  return (await verifyTestIdentity(
    request.headers,
    request.headers.get("x-playwright-test-role")
  )) !== null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueAdminStepUpToken({
  token,
  session,
  action,
  targetId,
}: {
  token: string;
  session: SessionContext;
  action: AdminStepUpAction;
  targetId: string;
}): Promise<Date> {
  const expiresAt = new Date(Date.now() + STEP_UP_TTL_MS);
  await connectMongoose();
  await AdminStepUpTokenModel.create({
    tokenHash: hashToken(token),
    userId: session.user.id,
    sessionId: session.session.id,
    action,
    targetId,
    expiresAt,
  });
  return expiresAt;
}

export async function consumeAdminStepUpToken({
  request,
  session,
  action,
  targetId,
}: {
  request: NextRequest;
  session: SessionContext;
  action: AdminStepUpAction;
  targetId: string;
}): Promise<void> {
  const token = request.cookies.get(ADMIN_STEP_UP_COOKIE)?.value;
  if (!token || token.length > 128) {
    throw new Error("Fresh administrator confirmation is required.");
  }

  await connectMongoose();
  const consumed = await AdminStepUpTokenModel.findOneAndUpdate(
    {
      tokenHash: hashToken(token),
      userId: session.user.id,
      sessionId: session.session.id,
      action,
      targetId,
      expiresAt: { $gt: new Date() },
      usedAt: { $exists: false },
    },
    { $set: { usedAt: new Date() } },
    { new: true }
  ).lean();

  if (!consumed) {
    throw new Error("Fresh administrator confirmation is required.");
  }
}

export function stepUpCookieOptions(request: NextRequest) {
  return {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "strict" as const,
    path: "/api/admin",
    maxAge: STEP_UP_TTL_MS / 1000,
  };
}