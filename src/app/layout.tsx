import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Solvy — A simpler way to understand",
  description:
    "Your focused workspace for mathematics and physics. Start with a problem. Find a simpler way to understand.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
