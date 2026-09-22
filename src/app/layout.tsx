import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "漫序 FrameFlow · AI 漫剧创作工作台",
  description:
    "让脑海里的故事，一帧一帧成为作品。剧本、角色、分镜、配音与成片，一站完成。",
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
