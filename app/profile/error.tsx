"use client";

import { ProfileTabError } from "./components/profile-tab-error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ProfileTabError
      error={error}
      reset={reset}
      title="个人中心"
    />
  );
}
