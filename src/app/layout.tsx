import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const sans = localFont({
  src: [
    {
      path: "../fonts/GeistVF.woff2",
      style: "normal",
    },
  ],
  variable: "--font-geist-sans",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
});

const mono = localFont({
  src: [
    {
      path: "../fonts/GeistMonoVF.woff2",
      style: "normal",
    },
  ],
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "monospace"],
});

export const metadata: Metadata = {
  title: "Neuroid — Agency Management",
  description: "Internal project management and creative operations tool",
  applicationName: "Neuroid",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1119" },
  ],
  colorScheme: "light dark",
};

// Inline script to avoid theme flash — runs before paint, reads localStorage preference
const themeScript = `(() => {
  try {
    const saved = localStorage.getItem('theme');
    const root = document.documentElement;
    if (saved === 'dark') root.classList.add('dark');
    else if (saved === 'light') root.classList.add('light');
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${sans.variable} ${mono.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
