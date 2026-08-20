import type { Metadata } from "next";
import "./globals.css";

const SITE_TITLE = "ANKUZO — SESSION 22";
const SITE_DESCRIPTION =
  "Игры, технологии и поздний интернет, собранные в одну физическую digital-сцену.";
const CANONICAL_ORIGIN = "https://ankuzo.online";

/**
 * Absolute origin every social-card URL is built from.
 *
 * Deployments override it with NEXT_PUBLIC_SITE_URL; the canonical production
 * origin is the fallback, so a crawler can never be handed a localhost URL.
 * Reading the origin from the environment instead of the request `host` header
 * also keeps this layout free of `headers()`, i.e. statically renderable.
 */
function resolveSiteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      return new URL(configured);
    } catch {
      // A malformed override must not break metadata: fall back below.
    }
  }
  return new URL(CANONICAL_ORIGIN);
}

export const metadata: Metadata = {
  metadataBase: resolveSiteUrl(),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "ru_RU",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: SITE_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The document language stays `ru`: the server-rendered prose (intro, error
  // note), the meta description and og:locale are all Russian. The 3D shell,
  // whose visible copy is entirely English, declares lang="en" on its own root
  // in components/portal/PortalExperience.tsx.
  //
  // There is no theme bootstrap any more. The site commits to one ground, so
  // nothing has to be decided before paint and there is no flash to prevent —
  // which also removes the only inline script on the page, and with it the
  // reason a future CSP would have needed `unsafe-inline` or a hash.
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
