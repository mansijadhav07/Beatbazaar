import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Wordmark } from "@/components/brand/Wordmark";

const columns = [
  {
    title: "Listen",
    links: [
      ["Browse beats", "/tracks"],
      ["Licenses", "/license-overview"],
      ["Install the app", "/install"],
    ],
  },
  {
    title: "Studio",
    links: [
      ["Copyright and takedown", "/copyright-and-takedown"],
    ],
  },
  {
    title: "Support",
    links: [
      ["FAQ", "/faq"],
      ["Help", "/help"],
      ["Contact", "/contact"],
      ["Delivery", "/delivery"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Terms", "/terms"],
      ["Privacy", "/privacy"],
      ["Refunds", "/refunds"],
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-band-dark text-sm text-ink">
      <div className="mx-auto grid max-w-container gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_2fr] lg:px-8">
        <div className="max-w-xs">
          <Link href="/" aria-label={`${siteConfig.name} home`}>
            <Wordmark />
          </Link>
          <p className="mt-4 leading-6 text-steel-dark">
            Original beats from the Astrylix studio. Preview free, license what fits, download the moment payment clears.
          </p>
        </div>
        <nav
          aria-label="Footer navigation"
          className="grid grid-cols-2 gap-8 sm:grid-cols-4"
        >
          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="font-display text-sm font-bold text-ink">{column.title}</h2>
              <ul className="mt-3 space-y-1">
                {column.links.map(([label, href]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="inline-flex min-h-9 items-center text-steel-dark underline-offset-4 hover:text-brass-light hover:underline"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-container flex-col gap-1 px-4 py-4 text-xs text-steel-dark sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>
            {new Date().getFullYear()} {siteConfig.name}. All beats remain the work of their producers.
          </p>
          <p>INR checkout in test mode</p>
        </div>
      </div>
    </footer>
  );
}
