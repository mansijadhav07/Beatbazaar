"use client";

import { useState, type FormEvent } from "react";

export default function OnboardingForm() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      legalBusinessName: String(formData.get("legalBusinessName") || ""),
      phone: String(formData.get("phone") || ""),
      pan: String(formData.get("pan") || ""),
      beneficiaryName: String(formData.get("beneficiaryName") || ""),
      accountNumber: String(formData.get("accountNumber") || ""),
      ifsc: String(formData.get("ifsc") || ""),
      acceptedProviderTerms: formData.get("acceptedProviderTerms") === "on",
    };

    try {
      const response = await fetch("/api/producer/payout-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        status?: { status: string };
        error?: string;
      };
      if (!response.ok) {
        setMessage(result.error || "Payout setup could not be submitted.");
        return;
      }

      form.reset();
      setMessage("Details submitted. Razorpay is reviewing your payout account.");
      window.location.reload();
    } catch {
      setMessage("Connection failed. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-ink">
          Legal name
          <input
            name="legalBusinessName"
            autoComplete="name"
            required
            maxLength={200}
            className="mt-1 h-11 w-full rounded border border-border bg-white px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel"
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          Phone
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            inputMode="tel"
            className="mt-1 h-11 w-full rounded border border-border bg-white px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel"
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          PAN, if available
          <input
            name="pan"
            autoComplete="off"
            maxLength={10}
            className="mt-1 h-11 w-full rounded border border-border bg-white px-3 text-base uppercase text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel"
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          Bank account holder name
          <input
            name="beneficiaryName"
            autoComplete="off"
            required
            maxLength={200}
            className="mt-1 h-11 w-full rounded border border-border bg-white px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel"
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          Bank account number
          <input
            name="accountNumber"
            autoComplete="off"
            required
            inputMode="numeric"
            minLength={6}
            maxLength={20}
            className="mt-1 h-11 w-full rounded border border-border bg-white px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel"
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          IFSC
          <input
            name="ifsc"
            autoComplete="off"
            required
            maxLength={11}
            className="mt-1 h-11 w-full rounded border border-border bg-white px-3 text-base uppercase text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel"
          />
        </label>
      </div>
      <p className="text-sm leading-6 text-steel-dark">
        Bank details and PAN are sent to Razorpay over HTTPS and are not saved
        by Beatbazaar. Aadhaar and identity documents are not collected here.
      </p>
      <p className="text-sm leading-6 text-steel-dark">
        This form currently supports individual account holders only. Registered
        companies and partnerships need a separate onboarding flow.
      </p>
      <label className="flex items-start gap-3 text-sm leading-6 text-ink">
        <input
          name="acceptedProviderTerms"
          type="checkbox"
          required
          className="mt-1 size-4 accent-steel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel"
        />
        <span>
          I have reviewed and agree to the applicable{" "}
          <a
            href="https://razorpay.com/terms/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-steel underline underline-offset-2"
          >
            Razorpay terms
          </a>{" "}
          for setting up a Route linked account.
        </span>
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="h-11 min-w-40 rounded bg-ink px-4 text-sm font-semibold text-white hover:bg-steel disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Sending details..." : "Set up payouts"}
      </button>
      <p aria-live="polite" className="text-sm text-steel-dark">
        {message}
      </p>
    </form>
  );
}
