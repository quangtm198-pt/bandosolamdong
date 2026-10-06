import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Địa chỉ đỏ Lâm Đồng",
  description:
    "Bản đồ số địa chỉ đỏ, di tích, danh thắng và hành trình về nguồn tỉnh Lâm Đồng.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}