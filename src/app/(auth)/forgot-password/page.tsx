"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklch,var(--brand)_22%,transparent),transparent_60%)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.65_0.18_320_/_0.22),transparent_60%)] blur-3xl"
      />

      <div
        className="w-full max-w-md"
        style={{ animation: "slide-up 0.5s var(--ease-out-expo) both" }}
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl gradient-brand text-brand-foreground shadow-glow">
            {submitted ? <CheckCircle2 className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">
            {submitted ? "Check your inbox" : "Reset password"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {submitted
              ? "If an account exists with that email, you'll receive a reset link shortly."
              : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {!submitted && (
          <div className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-lg backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@agency.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" variant="brand" size="lg" className="w-full">
                Send reset link
              </Button>
            </form>
          </div>
        )}

        <p className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
