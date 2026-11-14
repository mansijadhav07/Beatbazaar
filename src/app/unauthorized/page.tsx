import Link from "next/link";

export const metadata = {
  title: "Access not available",
  robots: { index: false, follow: false },
};

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ required?: string }>;
}) {
  const { required } = await searchParams;
  const accessMessage =
    required === "producer"
      ? "This page is for producer accounts. Sign in with a producer account to continue."
      : required === "buyer"
        ? "This page is for buyer accounts. Sign in with a buyer account to continue."
        : "You do not have permission to open this page. Sign in with an account that has access.";

  return (
    <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-ink">This account cannot open that page</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-ink">
        {accessMessage}
      </p>
      <Link
        href="/login"
        className="mt-5 inline-flex min-h-11 items-center bg-ink px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel"
      >
        Sign in with another account
      </Link>
    </div>
  );
}
