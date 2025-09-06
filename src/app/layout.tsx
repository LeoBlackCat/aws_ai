import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "AWS AI Practitioner Trainer",
    template: "%s | AWS AI Trainer",
  },
  description: "Interactive learning platform for AWS AI Practitioner certification preparation with quizzes, flashcards, and AI tutoring.",
  keywords: ["AWS", "AI", "Machine Learning", "Certification", "Training", "Education"],
  authors: [{ name: "AWS AI Trainer Team" }],
  creator: "AWS AI Trainer",
  publisher: "AWS AI Trainer",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AWS AI Trainer",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://aws-ai-trainer.vercel.app",
    title: "AWS AI Practitioner Trainer",
    description: "Master AWS AI concepts with interactive learning",
    siteName: "AWS AI Trainer",
  },
  twitter: {
    card: "summary_large_image",
    title: "AWS AI Practitioner Trainer",
    description: "Master AWS AI concepts with interactive learning",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AWS AI Trainer" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#232f3e" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
