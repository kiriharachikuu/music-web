"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SettingsTab } from "../tabs/settings-tab";
import { clearAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const handleLogout = () => {
    clearAuth();
    router.push("/");
  };
  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/profile"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-foreground/70 transition-colors hover:bg-foreground/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold">设置</h1>
      </div>
      <SettingsTab onLogout={handleLogout} />
    </div>
  );
}