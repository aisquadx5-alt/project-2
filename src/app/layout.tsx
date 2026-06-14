import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Customer Support Chatbot Platform",
  description: "Configure and monitor customer support AI agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
