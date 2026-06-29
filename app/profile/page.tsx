import { ProfileClient } from "@/app/profile/profile-client";

/**
 * 个人中心页（Server Component 壳）
 * - 用户数据需鉴权（cookie），交由 ProfileClient 在客户端拉取
 * - 5 个子模块：我喜欢的音乐 / 我的歌单 / 历史播放 / 下载管理(移动端) / 设置
 */
export default function ProfilePage() {
  return <ProfileClient />;
}
