import type { Metadata, Viewport } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import AppShell from "@/components/AppShell";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space", display: "swap" });

export const metadata: Metadata = {
  title: "Rememba — flashcards that remember for you",
  description:
    "Flashcards with spaced repetition: each card comes back just before you'd forget it. Study streaks, progress charts, and it works offline.",
  appleWebApp: { capable: true, title: "Rememba", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0d0f24" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f24" },
  ],
};

// Applies the saved theme (night mode unless you chose day mode) before the page is drawn, so there's no flash
const themeScript = `try{var t=localStorage.getItem("rememba:theme");if(t!=="light"&&t!=="dark")t="dark";document.documentElement.dataset.theme=t;if(localStorage.getItem("rememba:signedIn"))document.documentElement.dataset.signedIn="1"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className={`${fraunces.variable} ${space.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <AppShell>{children}</AppShell>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
