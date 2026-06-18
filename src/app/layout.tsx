import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";


export const metadata: Metadata = {
  title: "Skribbl.io Clone | Abhishek Sharma",
  description: "A real-time multiplayer drawing and guessing game built with Next.js, Socket.IO, and Node.js. Developed by Abhishek Kumar Sharma.",
  openGraph: {
    title: "Skribbl.io Clone | Abhishek Sharma",
    description: "Play this real-time multiplayer drawing and guessing game. Built from scratch using Next.js and WebSockets.",
    url: "https://skribbl-frontend-mocha.vercel.app",
    siteName: "Skribbl.io Clone",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Skribbl.io Clone | Abhishek Sharma",
    description: "Real-time multiplayer drawing and guessing game.",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
