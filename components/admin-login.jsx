"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

const ADMIN_ROLES = ["Super Admin", "Admin"];

export default function AdminLogin() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post("/auth/login", form);
      const roles = data?.user?.roles || [];
      const isAdmin = roles.some((r) => ADMIN_ROLES.includes(r));
      if (!isAdmin) {
        // Logged in but not an admin — clear the session and refuse.
        await api.post("/auth/logout").catch(() => {});
        setError("This account does not have admin access.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-lagoon-900">Email</span>
        <input
          type="email"
          value={form.email}
          onChange={update("email")}
          placeholder="admin@anthroplanet.com"
          autoComplete="email"
          required
          className="w-full rounded-xl border border-lagoon/15 bg-white px-4 py-3 text-lagoon-900 placeholder:text-lagoon/35 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-lagoon-900">Password</span>
        <input
          type="password"
          value={form.password}
          onChange={update("password")}
          placeholder="••••••••"
          autoComplete="current-password"
          required
          className="w-full rounded-xl border border-lagoon/15 bg-white px-4 py-3 text-lagoon-900 placeholder:text-lagoon/35 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-xl border border-chestnut/20 bg-chestnut/5 px-4 py-3 text-sm font-medium text-chestnut">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-lagoon-900 px-6 py-3.5 text-base font-semibold text-frost-50 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {loading ? "Signing in…" : "Sign in to admin"}
      </button>
    </form>
  );
}
