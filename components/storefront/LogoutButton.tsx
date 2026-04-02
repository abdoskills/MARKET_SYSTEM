"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.assign("/login");
      return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="min-h-[44px] rounded-xl bg-red-600 px-4 text-white font-bold disabled:opacity-60"
    >
      {loading ? "..." : "تسجيل الخروج"}
    </button>
  );
}
