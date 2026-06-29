"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";

import { API_BASE } from "@/lib/api";
import { setToken, setUser } from "@/lib/auth";
import { useAuthStore } from "@/lib/store/auth-store";
import type { UserProfile } from "@/lib/types";
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
 * 全局登录弹窗
 * - 由 useAuthStore.openLogin() 触发
 * - 当前页内嵌弹窗形式，不跳转
 * - 登录成功后：存储 token + user → 关闭弹窗 → router.refresh() → 调用 onSuccess
 * - 复用 login-client.tsx 的表单结构（Apple Music 风格深色卡片）
 */
export function LoginDialog() {
  const isOpen = useAuthStore((s) => s.isOpen);
  const closeLogin = useAuthStore((s) => s.closeLogin);
  const onSuccess = useAuthStore((s) => s.onSuccess);
  const router = useRouter();

  /** 登录成功统一处理 */
  const handleSuccess = React.useCallback(() => {
    closeLogin();
    // 刷新 SSR 数据，使页面读取新登录态
    router.refresh();
    // 调用调用方传入的回调（如重新拉取收藏列表）
    if (typeof onSuccess === "function") {
      try {
        onSuccess();
      } catch {
        /* 忽略回调异常 */
      }
    }
  }, [closeLogin, onSuccess, router]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) closeLogin();
      }}
    >
      <DialogContent className="max-w-md overflow-hidden border-white/10 bg-gradient-to-br from-primary-800 via-primary-900 to-gray-950 p-0 text-white sm:rounded-3xl">
        {/* 装饰光晕 */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-primary-300/10 blur-3xl" />

        <div className="relative p-6 md:p-8">
          <DialogHeader className="space-y-3 text-center">
            <div className="mx-auto flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/logo.png"
                alt="XingTone"
                className="h-14 w-14 rounded-2xl shadow-2xl"
              />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-white">
              XingTone
            </DialogTitle>
            <DialogDescription className="text-sm text-white/50">
              登录后即可收藏歌曲、管理歌单、同步播放历史
            </DialogDescription>
          </DialogHeader>

          <LoginForm onSuccess={handleSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** 登录表单（登录 + 注册） */
function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = React.useState<Mode>("login");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  // 登录表单
  const [account, setAccount] = React.useState("");
  const [password, setPassword] = React.useState("");

  // 注册表单
  const [regUsername, setRegUsername] = React.useState("");
  const [regEmail, setRegEmail] = React.useState("");
  const [regPassword, setRegPassword] = React.useState("");
  const [regConfirm, setRegConfirm] = React.useState("");

  /** 表单校验，返回错误信息（空字符串表示通过） */
  function validate(): string {
    if (mode === "login") {
      if (!account.trim()) return "请输入用户名或邮箱";
      if (!password) return "请输入密码";
      if (password.length < 6) return "密码至少 6 位";
      return "";
    }
    // 注册
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

      // 直接用 fetch，绕过 api.ts 的 401 全局弹窗逻辑
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
      // 存储 token + 用户信息
      setToken(data.token);
      setUser(data.user);

      // 重置表单
      setAccount("");
      setPassword("");
      setRegUsername("");
      setRegEmail("");
      setRegPassword("");
      setRegConfirm("");
      setError("");

      // 触发上层统一处理：关闭弹窗 + 刷新 + 回调
      onSuccess();
    } catch {
      setError("网络请求失败，请检查网络后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      {/* 模式切换 */}
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
              ? "bg-primary-700 text-white shadow-lg"
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
              ? "bg-primary-700 text-white shadow-lg"
              : "text-white/60 hover:text-white"
          )}
        >
          注册
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "login" ? (
          <>
            {/* 登录：用户名/邮箱 */}
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
            {/* 登录：密码 */}
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
            {/* 注册：用户名 */}
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
            {/* 注册：邮箱 */}
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
            {/* 注册：密码 */}
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
            {/* 注册：确认密码 */}
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

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-700 py-3 font-medium text-white shadow-lg shadow-primary-700/30 transition-all hover:bg-primary-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading
            ? "处理中..."
            : mode === "login"
              ? "登录"
              : "注册并登录"}
        </button>
      </form>
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
          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-white placeholder:text-white/30 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
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
          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 text-sm text-white placeholder:text-white/30 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-label={show ? "隐藏密码" : "显示密码"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60 disabled:opacity-50"
        >
          {show ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
