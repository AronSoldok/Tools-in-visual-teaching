import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Base Ten Blocks — интерактивная доска",
  description:
    "Визуальный инструмент для учителей: блоки разрядов, перегруппировка, аннотации, глобус и карта. Работает полностью в браузере.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={nunito.variable}>
      <body className={nunito.className}>{children}</body>
    </html>
  );
}
