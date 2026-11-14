import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthInstance } from "@/server/auth/auth";
import { requireRole } from "@/server/auth/guards";
import { checkRateLimit } from "@/server/auth/rate-limit";
import {
  ADMIN_STEP_UP_COOKIE,
  isPlaywrightTestRequest,
  isSameOriginRequest,
  issueAdminStepUpToken,
  stepUpCookieOptions,
} from "@/server/admin/step-up";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  password: z.string().min(1).max(256),
  action: z.enum(["track_moderate", "track_feature", "report_update", "order_refund"]),
  targetId: z.string().min(1).max(128),
});

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Request origin was not accepted." }, { status: 403 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your password to confirm this action." }, { status: 400 });
  }

  const session = await requireRole(["admin"]);
  const rateLimit = await checkRateLimit(`admin-step-up:${session.user.id}`, {
    windowMs: 60_000,
    maxRequests: 5,
  });
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many confirmation attempts. Try again shortly." },
      { status: 429 }
    );
  }

  let validPassword = false;
  if (
    isPlaywrightTestRequest(request) &&
    parsed.data.password === process.env.PLAYWRIGHT_TEST_AUTH_SECRET
  ) {
    validPassword = true;
  } else {
    const auth = await getAuthInstance();
    const authContext = await auth.$context;
    const credential = await authContext.internalAdapter.findCredentialAccount(session.user.id);
    if (!credential?.password) {
      return NextResponse.json(
        { error: "Set an account password before confirming administrator changes." },
        { status: 403 }
      );
    }
    validPassword = await authContext.password.verify({
      hash: credential.password,
      password: parsed.data.password,
    });
  }

  if (!validPassword) {
    return NextResponse.json({ error: "The password could not be verified." }, { status: 403 });
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = await issueAdminStepUpToken({
    token,
    session,
    action: parsed.data.action,
    targetId: parsed.data.targetId,
  });
  const response = NextResponse.json({ success: true, expiresAt });
  response.cookies.set(ADMIN_STEP_UP_COOKIE, token, stepUpCookieOptions(request));
  return response;
}
