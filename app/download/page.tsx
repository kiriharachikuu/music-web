import type { Metadata } from "next";

import { DownloadClient } from "./download-client";

export const metadata: Metadata = {
  title: "下载 App",
  description: "下载 XingTone 星瞳音乐 App，支持 Android 客户端，原生音乐播放体验",
};

export default function DownloadPage() {
  return <DownloadClient />;
}
