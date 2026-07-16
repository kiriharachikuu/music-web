"use client";

import * as React from "react";
import {
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
  ResponsiveDialogDescription,
} from "@/components/ui/responsive-dialog";

export interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

function evaluatePasswordStrength(pwd: string): PasswordStrength {
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const map: Record<number, { label: string; color: string }> = {
    0: { label: "非常弱", color: "bg-red-500" },
    1: { label: "弱", color: "bg-orange-500" },
    2: { label: "一般", color: "bg-yellow-500" },
    3: { label: "强", color: "bg-green-500" },
    4: { label: "非常强", color: "bg-emerald-600" },
  };
  return { score: clamped, ...map[clamped] };
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const toast = useToast();

  const strength = React.useMemo(
    () => evaluatePasswordStrength(newPassword),
    [newPassword]
  );
  const confirmMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const confirmMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  const isValid =
    currentPassword.length > 0 &&
    newPassword.length >= 6 &&
    confirmMatch &&
    newPassword !== currentPassword;

  React.useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || saving) return;

    setSaving(true);
    try {
      const result = (await api.post<{ token: string }>("/user/password", {
        currentPassword,
        newPassword,
        confirmPassword,
      })) as { token: string };

      if (result?.token) {
        setToken(result.token);
      }

      toast.success("密码修改成功", {
        description: "其他已登录设备将自动登出",
      });
      onOpenChange(false);
    } catch (err) {
      toast.error("修改失败", {
        description: err instanceof Error ? err.message : "请稍后重试",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            修改密码
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            为了账户安全，修改密码后其他已登录设备将自动登出
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">
              当前密码
            </label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="请输入当前密码"
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70"
                tabIndex={-1}
              >
                {showCurrent ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">
              新密码
            </label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少 6 位，建议包含大小写、数字和符号"
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70"
                tabIndex={-1}
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {newPassword.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors",
                        i < strength.score ? strength.color : "bg-foreground/10"
                      )}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-foreground/50">
                    密码强度：
                    <span className="font-medium text-foreground/80">
                      {strength.label}
                    </span>
                  </span>
                  {newPassword === currentPassword &&
                    newPassword.length > 0 && (
                      <span className="text-red-500">
                        新密码不能与当前密码相同
                      </span>
                    )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">
              确认新密码
            </label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                autoComplete="new-password"
                className={cn(
                  "pr-10",
                  confirmMismatch && "border-red-500 focus-visible:ring-red-500"
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70"
                tabIndex={-1}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              {confirmPassword.length > 0 && (
                <span className="absolute right-10 top-1/2 -translate-y-1/2">
                  {confirmMatch ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </span>
              )}
            </div>
            {confirmMismatch && (
              <p className="text-[11px] text-red-500">两次输入的密码不一致</p>
            )}
          </div>

          <ResponsiveDialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={!isValid || saving}
              className="min-w-[100px]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  修改中
                </>
              ) : (
                "确认修改"
              )}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
