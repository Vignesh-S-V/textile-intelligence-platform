import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Textile Intelligence Platform",
  description:
    "Yarn prices, textile market intelligence, loom intelligence and price forecasting platform.",
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
