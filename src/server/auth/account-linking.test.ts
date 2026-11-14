import { describe, expect, it } from "vitest";
import { accountLinkingConfig } from "./account-linking";

describe("OAuth account linking policy", () => {
  it("requires both local and provider email verification and only links the matching address", () => {
    expect(accountLinkingConfig).toEqual({
      enabled: true,
      requireLocalEmailVerified: true,
      allowDifferentEmails: false,
    });
    expect(accountLinkingConfig).not.toHaveProperty("trustedProviders");
  });

});
