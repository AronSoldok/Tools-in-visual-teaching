import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Base Ten Blocks — интерактивная доска",
  description:
    "Визуальный инструмент для учителей: блоки разрядов, перегруппировка, аннотации. Работает полностью в браузере.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
