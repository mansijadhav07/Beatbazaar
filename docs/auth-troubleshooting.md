# Authentication and email troubleshooting

## What blocks sign-in

Email/password sign-in requires `emailVerified` to be true. Registration can
create the user before the transactional email provider accepts the verification
message. In that case, the user exists but cannot sign in until a verification
link is accepted.

Previously, there was no resend control on the sign-in form or verification
page. Better Auth does not automatically resend on sign-in by default. This
left an unverified account with no recovery action in the interface.

## Recovery in the app

1. Open `/login` and enter the registered email and password.
2. If the account is unverified, use **Resend verification email**.
3. Or open `/verify-email`, enter the registered email, and request a new link.
4. Follow the newest link. Then return to sign in.

The resend response is intentionally generic so it does not confirm whether an
email address has an account. Provider failures produce a visible error instead
of a false success message.

## Google sign-in says `account_not_linked`

Google sign-in can match an existing email/password account. The app links it
only when both the existing account and Google's matching email are verified.
It does not trust the provider name to bypass Google's email verification
claim, and it does not allow linking a different email. If the existing
password account is not verified, sign in with its password first and use the
verification resend action. Then retry Google sign-in.

The Google OAuth client must also be configured with the exact local callback
URL shown by Better Auth for this app. For local sign-in it must match
`http://localhost:3000/api/auth/callback/google`. The presence of OAuth values
in `.env.local` does not prove that the client credentials or Google redirect
URI are valid.

When opening the development app through an ngrok `ngrok-free.dev` tunnel,
Next.js allows that tunnel origin to load development assets. This does not
change the Better Auth base URL or the Google OAuth callback URI. For the
current tunnel shown in the dev log, set both `BETTER_AUTH_URL` and
`NEXT_PUBLIC_APP_URL` in `.env.local` to
`https://breach-mummy-fructose.ngrok-free.dev`, and authorize
`https://breach-mummy-fructose.ngrok-free.dev/api/auth/callback/google` in the
Google OAuth client. If the tunnel hostname changes, update all three values
and restart the app. Do not mix the localhost callback with a tunnel-based
OAuth session.

## Development webpack cache `ENOENT`

Next.js development uses an in-memory webpack cache rather than its
filesystem-backed pack cache. This avoids requests to missing `.pack.gz` files
after a local cache entry is invalidated. Restart the dev server after pulling
this change so the updated Next.js configuration is loaded.

## Local configuration

- `EMAIL_SERVER_API_KEY` must contain the Resend API key.
- Resend testing mode only delivers to the Resend account owner's email
  address. The `resend.dev` sender is not authorized to deliver verification
  messages to arbitrary users.
- To deliver to users, verify a domain in Resend and set `EMAIL_FROM` to a
  sender address on that verified domain. The sender and API key must belong
  to the same Resend account.
- For local-only testing without external delivery, set
  `EMAIL_SERVER_API_KEY=mock`. The app writes the verification link to the
  dev-server terminal. Do not use this mode in production.
- Restart `npm run dev` after editing `.env.local`.
- Playwright sets the email provider to `mock`; it does not send external mail.
- Development logs mock email content in the server terminal. These links are
  for local testing only.

Provider HTTP errors are logged with a safe status-only message, not the
provider response body. Actual provider acceptance and inbox delivery require
access to the Resend account. Do not paste API keys or verification links into
issue reports or chat.
