import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HIMSight",
  description: "HIM Wellness TTDI Dashboard",
  icons: {
    icon: '/favicon.svg',
  },
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
