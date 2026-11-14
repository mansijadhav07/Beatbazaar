import type { BetterAuthOptions } from "better-auth";

type AccountLinkingOptions = NonNullable<
  NonNullable<BetterAuthOptions["account"]>["accountLinking"]
>;

export const accountLinkingConfig = {
  enabled: true,
  requireLocalEmailVerified: true,
  allowDifferentEmails: false,
} satisfies AccountLinkingOptions;
