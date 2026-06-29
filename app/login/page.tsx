import { Suspense } from "react";
import { LoginClient } from "./login-client";

/**
 * 登录 / 注册页（全屏独立页面，不显示应用外壳）
 * useSearchParams 需包裹 Suspense 以支持静态生成
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
