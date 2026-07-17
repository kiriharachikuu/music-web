"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail, User, X } from "lucide-react";

import { API_BASE } from "@/lib/api";
import { setToken, setUser } from "@/lib/auth";
import { useAuthStore } from "@/lib/store/auth-store";
import type { UserProfile } from "@/lib/types";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { AppImage } from "@/components/ui/app-image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** 登录/注册响应体 */
interface AuthResult {
  token: string;
  user: UserProfile;
}

/** 表单模式 */
type Mode = "login" | "register";

/**
 * 全局登录组件
 * - 移动端：底部抽屉（Sheet）
 * - PC 端：居中弹窗（Dialog）
 * - 由 useAuthStore.openLogin() 触发
 * - 登录成功后：存储 token + user → 关闭 → router.refresh() → 调用 onSuccess
 */
export function LoginSheet() {
  const isOpen = useAuthStore((s) => s.isOpen);
  const closeLogin = useAuthStore((s) => s.closeLogin);
  const onSuccess = useAuthStore((s) => s.onSuccess);
  const router = useRouter();
  const isMobile = useIsMobile();

  const handleSuccess = React.useCallback(() => {
    closeLogin();
    router.refresh();
    if (typeof onSuccess === "function") {
      try {
        onSuccess();
      } catch {
        /* 忽略回调异常 */
      }
    }
  }, [closeLogin, onSuccess, router]);

  const content = (
    <LoginContent onSuccess={handleSuccess} onClose={closeLogin} />
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(v) => !v && closeLogin()}>
        <SheetContent
          side="bottom"
          className="border-t-0 rounded-t-[28px] bg-gradient-to-br from-primary/90 via-primary/95 to-gray-950 p-0 text-white shadow-2xl sm:rounded-t-[32px]"
        >
          <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

          <div
            className="relative flex h-1.5 w-12 shrink-0 rounded-full bg-white/20 mx-auto mt-3 mb-1"
            aria-hidden="true"
          />

          <div className="relative px-6 pb-6 pt-2 md:px-8 md:pb-8 max-h-[85vh] overflow-y-auto">
            <SheetHeader className="space-y-3 text-center">
              <div className="mx-auto flex items-center justify-center">
                <AppImage
                  src="/icons/logo.png"
                  alt="XingTone"
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-2xl shadow-2xl"
                />
              </div>
              <SheetTitle className="text-xl font-bold tracking-tight text-white">
                XingTone
              </SheetTitle>
              <SheetDescription className="text-sm text-white/50">
                登录后即可收藏歌曲、管理歌单、同步播放历史
              </SheetDescription>
            </SheetHeader>
            {content}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && closeLogin()}>
      <DialogContent className="overflow-hidden p-0 border-0 shadow-2xl max-w-md bg-gradient-to-br from-primary/90 via-primary/95 to-gray-950 text-white">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

        <button
          type="button"
          onClick={closeLogin}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-10"
        >
          <X className="h-4 w-4 text-white" />
          <span className="sr-only">关闭</span>
        </button>

        <div className="relative px-8 pb-8 pt-8">
          <DialogHeader className="space-y-3 text-center">
            <div className="mx-auto flex items-center justify-center">
              <AppImage
                src="/icons/logo.png"
                alt="XingTone"
                width={64}
                height={64}
                className="h-16 w-16 rounded-2xl shadow-2xl"
              />
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight text-white">
              XingTone
            </DialogTitle>
            <DialogDescription className="text-sm text-white/50">
              登录后即可收藏歌曲、管理歌单、同步播放历史
            </DialogDescription>
          </DialogHeader>
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** 登录表单容器（不含外壳） */
function LoginContent({
  onSuccess,
  onClose,
}: {
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = React.useState<Mode>("login");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const [account, setAccount] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [regUsername, setRegUsername] = React.useState("");
  const [regEmail, setRegEmail] = React.useState("");
  const [regPassword, setRegPassword] = React.useState("");
  const [regConfirm, setRegConfirm] = React.useState("");

  function validate(): string {
    if (mode === "login") {
      if (!account.trim()) return "请输入用户名或邮箱";
      if (!password) return "请输入密码";
      if (password.length < 6) return "密码至少 6 位";
      return "";
    }
    if (!regUsername.trim()) return "请输入用户名";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) return "邮箱格式不正确";
    if (regPassword.length < 6) return "密码至少 6 位";
    if (regPassword !== regConfirm) return "两次输入的密码不一致";
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body =
        mode === "login"
          ? { account: account.trim(), password }
          : {
              username: regUsername.trim(),
              email: regEmail.trim(),
              password: regPassword,
            };

      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.message || `请求失败 (${res.status})`);
        return;
      }

      const data = json.data as AuthResult;
      setToken(data.token);
      setUser(data.user);

      setAccount("");
      setPassword("");
      setRegUsername("");
      setRegEmail("");
      setRegPassword("");
      setRegConfirm("");
      setError("");

      onSuccess();
    } catch {
      setError("网络请求失败，请检查网络后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-6 flex rounded-full bg-white/5 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError("");
          }}
          className={cn(
            "flex-1 rounded-full py-2 text-sm font-medium transition-colors",
            mode === "login"
              ? "bg-primary text-white shadow-lg"
              : "text-white/60 hover:text-white"
          )}
        >
          登录
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setError("");
          }}
          className={cn(
            "flex-1 rounded-full py-2 text-sm font-medium transition-colors",
            mode === "register"
              ? "bg-primary text-white shadow-lg"
              : "text-white/60 hover:text-white"
          )}
        >
          注册
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "login" ? (
          <>
            <FormField
              icon={User}
              label="用户名 / 邮箱"
              type="text"
              value={account}
              onChange={setAccount}
              placeholder="输入用户名或邮箱"
              autoComplete="username"
              disabled={loading}
            />
            <PasswordField
              label="密码"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((s) => !s)}
              placeholder="输入密码"
              autoComplete="current-password"
              disabled={loading}
            />
          </>
        ) : (
          <>
            <FormField
              icon={User}
              label="用户名"
              type="text"
              value={regUsername}
              onChange={setRegUsername}
              placeholder="设置用户名"
              autoComplete="username"
              disabled={loading}
            />
            <FormField
              icon={Mail}
              label="邮箱"
              type="email"
              value={regEmail}
              onChange={setRegEmail}
              placeholder="your@email.com"
              autoComplete="email"
              disabled={loading}
            />
            <PasswordField
              label="密码"
              value={regPassword}
              onChange={setRegPassword}
              show={showPassword}
              onToggle={() => setShowPassword((s) => !s)}
              placeholder="至少 6 位"
              autoComplete="new-password"
              disabled={loading}
            />
            <PasswordField
              label="确认密码"
              value={regConfirm}
              onChange={setRegConfirm}
              show={showPassword}
              onToggle={() => setShowPassword((s) => !s)}
              placeholder="再次输入密码"
              autoComplete="new-password"
              disabled={loading}
            />
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-medium text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading
            ? "处理中..."
            : mode === "login"
              ? "登录"
              : "注册并登录"}
        </button>
      </form>

      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full rounded-full border border-white/10 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
      >
        取消
      </button>
    </div>
  );
}

/** 普通输入字段（带图标） */
function FormField({
  icon: Icon,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
}: {
  icon: typeof User;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-white/60">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-white placeholder:text-white/30 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
      </div>
    </div>
  );
}

/** 密码输入字段（带显示/隐藏切换） */
function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  autoComplete,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-white/60">
        {label}
      </label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 text-sm text-white placeholder:text-white/30 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-label={show ? "隐藏密码" : "显示密码"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60 disabled:opacity-50"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
