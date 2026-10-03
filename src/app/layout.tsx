import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "漫序 · AIGC 产品与创作工作台",
  description:
    "把产品研究、模型评测、漫剧创作和质量复测沉淀在同一个个人工作台。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
