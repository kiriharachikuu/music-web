"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";

import { API_BASE } from "@/lib/api";
import { setToken, setUser, isAuthenticated } from "@/lib/auth";
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 登录/注册响应体 */
interface AuthResult {
  token: string;
  user: UserProfile;
}

/** 表单模式 */
type Mode = "login" | "register";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // 已登录则直接跳转
  React.useEffect(() => {
    if (isAuthenticated()) {
      const from = searchParams.get("from") || "/";
      router.replace(from);
    }
  }, [router, searchParams]);

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

      // 直接用 fetch，绕过 api.ts 的 401 全局跳转逻辑
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

      // 跳转到来源页或首页
      const from = searchParams.get("from") || "/";
      router.push(from);
      router.refresh();
    } catch {
      setError("网络请求失败，请检查网络后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-primary/90 via-primary/95 to-gray-950 px-4 py-10">
      {/* 装饰光晕 */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

      {/* 卡片 */}
      <div className="relative w-full max-w-md">
        {/* Logo + 标题 */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center">
            <div className="absolute inset-0 animate-pulse rounded-3xl bg-white/10 blur-xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/logo.png"
              alt="XingTone"
              className="relative h-16 w-16 rounded-2xl shadow-2xl"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            XingTone
          </h1>
          <p className="mt-1 text-sm text-white/50">
            登录后即可收藏歌曲、管理歌单、同步播放历史
          </p>
        </div>

        {/* 表单卡片 */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
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
        </div>

        {/* 返回首页 */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-white/40 transition-colors hover:text-white/70"
          >
            ← 返回首页
          </Link>
        </div>
      </div>
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
