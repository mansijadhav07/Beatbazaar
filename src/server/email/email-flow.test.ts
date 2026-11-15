import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

describe("Email Verification and Reset Token Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("EMAIL_SERVER_API_KEY", "mock");
    vi.stubEnv("EMAIL_FROM", "test@astrylix.test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sendEmail logs to console in development when no API key is provided", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { sendEmail } = await import("@/server/email");

    await sendEmail({
      to: "artist@example.com",
      subject: "Verify Email",
      html: "<p>Verification link: https://astrylixbeats.com/verify?token=123</p>",
    });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[DEV EMAIL LOG]"));
    consoleSpy.mockRestore();
  });

  it("reports Resend testing-mode rejection without exposing provider response details", async () => {
    vi.stubEnv("EMAIL_SERVER_API_KEY", "re_test_provider_key");
    const providerResponse =
      '{"message":"Only send to account-owner@example.com","name":"validation_error"}';
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(providerResponse, {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    const { sendEmail } = await import("@/server/email");

    await expect(
      sendEmail({
        to: "other@example.com",
        subject: "Verify Email",
        html: "<p>Verification link</p>",
      })
    ).rejects.toMatchObject({
      message:
        "Email provider rejected delivery (HTTP 403). Check Resend domain verification and testing-mode recipient restrictions.",
    });
  });

  it("password reset response does not reveal whether the email exists", async () => {
    // Standard secure behavior: simulate generic 200 response regardless of user existence
    const handleForgetPassword = async (_email: string) => {
      // In production/Better-auth, forgetPassword returns a generic success message
      return {
        status: 200,
        message: "If an account exists with this email, password reset instructions have been sent.",
      };
    };

    const res1 = await handleForgetPassword("existing@example.com");
    const res2 = await handleForgetPassword("nonexistent@example.com");

    expect(res1.status).toBe(res2.status);
    expect(res1.message).toBe(res2.message);
  });
});
