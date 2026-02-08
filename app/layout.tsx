import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HIMSight TTDI Dashboard",
  description: "HIM Wellness TTDI Dashboard",
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
