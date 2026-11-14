import "server-only";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  const apiKey = process.env.EMAIL_SERVER_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;

  if (
    !apiKey ||
    apiKey.startsWith("re_your") ||
    apiKey === "mock" ||
    !fromEmail
  ) {
    if (process.env.NODE_ENV !== "production") {
      console.log("==================== [DEV EMAIL LOG] ====================");
      console.log(`To: ${to}`);
      console.log(`From: ${fromEmail || "EMAIL_FROM not configured"}`);
      console.log(`Subject: ${subject}`);
      console.log("----------------------- Content -----------------------");
      console.log(text || html);
      console.log("=========================================================");
      return;
    }
    throw new Error("EMAIL_SERVER_API_KEY and EMAIL_FROM must be configured in production.");
  }

  // Resend API (default transactional provider)
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, " "),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email provider error (${response.status}): ${errorText}`);
  }
}
