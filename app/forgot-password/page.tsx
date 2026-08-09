"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail, MessageSquare, ShieldCheck, Smartphone, type LucideIcon } from "lucide-react";

import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toaster";

type ResetMethod = "sms" | "email";

const SERVICE_UNAVAILABLE = "找回密码服务暂未上线";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const toast = useToast();
  const [method, setMethod] = React.useState<ResetMethod>("sms");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);

  React.useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const accountValue = method === "sms" ? phone.trim() : email.trim();

  function getErrorMessage(status: number, fallback: string) {
    if (status === 404) return SERVICE_UNAVAILABLE;
    return fallback || `请求失败 (${status})`;
  }

  async function parseErrorMessage(res: Response) {
    try {
      const json = (await res.json()) as { message?: string };
      return json.message || `请求失败 (${res.status})`;
    } catch {
      return `请求失败 (${res.status})`;
    }
  }

  async function handleSendCode() {
    if (sending || countdown > 0) return;
    if (!accountValue) {
      toast.error(method === "sms" ? "请输入手机号" : "请输入邮箱");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, phone: method === "sms" ? accountValue : undefined, email: method === "email" ? accountValue : undefined }),
        credentials: "include",
      });

      if (!res.ok) {
        toast.error(getErrorMessage(res.status, await parseErrorMessage(res)));
        return;
      }

      toast.success("验证码已发送", { description: "请在 5 分钟内完成重置" });
      setCountdown(60);
    } catch {
      toast.error("网络请求失败，请检查网络后重试");
    } finally {
      setSending(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (resetting) return;
    if (!accountValue) {
      toast.error(method === "sms" ? "请输入手机号" : "请输入邮箱");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      toast.error("请输入 6 位验证码");
      return;
    }
    if (password.length < 8) {
      toast.error("新密码至少 8 位");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    setResetting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, phone: method === "sms" ? accountValue : undefined, email: method === "email" ? accountValue : undefined, code, newPassword: password, confirmPassword }),
        credentials: "include",
      });

      if (!res.ok) {
        toast.error(getErrorMessage(res.status, await parseErrorMessage(res)));
        return;
      }

      toast.success("密码重置成功", { description: "请使用新密码登录" });
      router.push("/login");
    } catch {
      toast.error("网络请求失败，请检查网络后重试");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-lg shadow-primary/10">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">找回密码</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            选择短信或邮箱验证身份后重置登录密码
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-xl md:p-8">
          <div className="mb-6 flex rounded-full bg-muted p-1">
            <button
              type="button"
              onClick={() => setMethod("sms")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm font-medium transition-colors",
                method === "sms"
                  ? "bg-primary text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              短信
            </button>
            <button
              type="button"
              onClick={() => setMethod("email")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm font-medium transition-colors",
                method === "email"
                  ? "bg-primary text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Mail className="h-4 w-4" />
              邮箱
            </button>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            {method === "sms" ? (
              <FormField
                icon={Smartphone}
                label="手机号"
                type="tel"
                value={phone}
                onChange={setPhone}
                placeholder="输入手机号"
                autoComplete="tel"
                disabled={resetting}
              />
            ) : (
              <FormField
                icon={Mail}
                label="邮箱"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="your@email.com"
                autoComplete="email"
                disabled={resetting}
              />
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                验证码
              </label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6 位验证码"
                    autoComplete="one-time-code"
                    disabled={resetting}
                    className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sending || countdown > 0 || resetting}
                  className="h-11 shrink-0 rounded-xl border border-border px-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? "发送中..." : countdown > 0 ? `${countdown}s` : "获取验证码"}
                </button>
              </div>
            </div>

            <PasswordField
              label="新密码"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((s) => !s)}
              placeholder="至少 8 位"
              autoComplete="new-password"
              disabled={resetting}
            />
            <PasswordField
              label="确认密码"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showPassword}
              onToggle={() => setShowPassword((s) => !s)}
              placeholder="再次输入新密码"
              autoComplete="new-password"
              disabled={resetting}
            />

            <button
              type="submit"
              disabled={resetting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-medium text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resetting && <Loader2 className="h-4 w-4 animate-spin" />}
              {resetting ? "重置中..." : "重置密码"}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← 返回登录
          </Link>
        </div>
      </div>
    </div>
  );
}

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
  icon: LucideIcon;
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
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
      </div>
    </div>
  );
}

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
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-label={show ? "隐藏密码" : "显示密码"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
