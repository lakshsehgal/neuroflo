"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        setError(`Server error (${res.status}). Please try again.`);
        setLoading(false);
        return;
      }

      if (!res.ok || data.error) {
        setError(data.error || `Error (${res.status}). Please try again.`);
        setLoading(false);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(`Connection error: ${err instanceof Error ? err.message : "Unknown"}`);
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Animated gradient orbs - golden theme */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -40, 20, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-amber-500/10 to-transparent blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -20, 30, 0],
            y: [0, 30, -20, 0],
            scale: [1, 0.95, 1.1, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-32 -right-32 h-[600px] w-[600px] rounded-full bg-gradient-to-tl from-yellow-600/8 to-transparent blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, 15, -15, 0],
            y: [0, -15, 25, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/3 left-1/4 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-amber-600/5 to-orange-600/5 blur-3xl"
        />
      </div>

      {/* Noise texture overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
      }} />

      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center">
        <div className="relative z-10 flex flex-col items-center px-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative">
              <div className="absolute inset-0 blur-3xl bg-amber-500/20 rounded-full scale-150" />
              <Image
                src="/images/icon.webp"
                alt="Neuroid"
                width={140}
                height={140}
                className="relative drop-shadow-2xl"
              />
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-10 text-center"
          >
            <h2 className="text-4xl font-bold text-white tracking-tight">
              Neuroid <span className="text-amber-400">OS</span>
            </h2>
            <p className="mt-3 text-white/40 text-lg max-w-xs">
              Agency management, reimagined.
            </p>
          </motion.div>

          {/* Decorative line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-10 h-px w-48 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-6 flex items-center gap-6 text-white/20 text-xs uppercase tracking-widest"
          >
            <span>Manage</span>
            <span className="h-1 w-1 rounded-full bg-amber-500/40" />
            <span>Collaborate</span>
            <span className="h-1 w-1 rounded-full bg-amber-500/40" />
            <span>Deliver</span>
          </motion.div>
        </div>

        {/* Vertical separator */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2/3 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
      </div>

      {/* Right panel - Login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-sm"
        >
          {/* Mobile logo - only shows on small screens */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mb-10 text-center lg:hidden"
          >
            <div className="flex flex-col items-center gap-4 mb-3">
              <div className="relative">
                <div className="absolute inset-0 blur-2xl bg-amber-500/20 rounded-full scale-150" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/icon.webp"
                  alt="Neuroid"
                  width={80}
                  height={80}
                  className="relative drop-shadow-xl"
                />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Neuroid <span className="text-amber-400">OS</span>
              </h1>
            </div>
          </motion.div>

          {/* Desktop heading */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mb-8 hidden lg:block"
          >
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-white/40">
              Sign in to your workspace
            </p>
          </motion.div>

          {/* Mobile subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mb-8 text-center text-sm text-white/40 lg:hidden"
          >
            Sign in to your workspace
          </motion.p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <label htmlFor="email" className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-lg border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:border-amber-500/40 focus:ring-amber-500/20 transition-colors"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-white/50 uppercase tracking-wider">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-lg border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:border-amber-500/40 focus:ring-amber-500/20 transition-colors"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="pt-1"
            >
              <Button
                type="submit"
                className="w-full h-11 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-semibold hover:from-amber-400 hover:to-yellow-400 transition-all active:scale-[0.98] shadow-lg shadow-amber-500/20"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.8,
                        ease: "linear",
                      }}
                      className="inline-block h-4 w-4 rounded-full border-2 border-black border-t-transparent"
                    />
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </Button>
            </motion.div>
          </form>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="mt-10 text-center"
          >
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />
            <p className="text-xs text-white/20">
              Neuroid OS &middot; Agency Management Platform
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
