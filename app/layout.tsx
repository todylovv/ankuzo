import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") || host.startsWith("127.") ? "http" : "https";
  const origin = `${protocol}://${host}`;
  const title = "ANKUZO — SESSION 22";
  const description = "Игры, технологии и поздний интернет, собранные в одну физическую digital-сцену.";
  return {
    title,
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title, description, type: "website", locale: "ru_RU", images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "ANKUZO — SESSION 22" }] },
    twitter: { card: "summary_large_image", title, description, images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeBootstrap = `(function(){try{var q=new URLSearchParams(location.search).get('theme');var s=localStorage.getItem('ankuzo-theme');var t=(q==='light'||q==='dark')?q:((s==='light'||s==='dark')?s:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;
  return (
    <html lang="ru" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body>{children}</body>
    </html>
  );
}
