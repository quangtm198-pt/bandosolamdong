"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LockKeyhole, Mail } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (loginError || !data.user) {
      setError("Email hoặc mật khẩu không chính xác.");
      setLoading(false);
      return;
    }

    const { data: admin, error: adminError } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (adminError || !admin) {
      await supabase.auth.signOut();
      setError("Tài khoản chưa được cấp quyền quản trị.");
      setLoading(false);
      return;
    }

    router.replace("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow-lg"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
            <LockKeyhole size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            QUẢN TRỊ BẢN ĐỒ SỐ
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Lâm Đồng – Bản giao hưởng xanh
          </p>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Email quản trị</span>
          <div className="flex items-center gap-2 rounded-lg border px-3">
            <Mail size={18} className="text-gray-400" />
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full py-3 outline-none"
              placeholder="Nhập email"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Mật khẩu</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border px-3 py-3 outline-none focus:border-green-600"
            placeholder="Nhập mật khẩu"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-green-700 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-60"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-full py-2 text-sm text-gray-500 hover:text-green-700"
        >
          Quay lại bản đồ
        </button>
      </form>
    </main>
  );
}