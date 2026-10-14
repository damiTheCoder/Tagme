"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthCard, AuthInput, AuthFooterLink } from "../auth-card";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Full navigation so the fresh session cookies are read from the jar.
    window.location.href = "/onboarding";
  }

  return (
    <AuthCard
      title="Create your shop"
      subtitle="Start taking AI orders in minutes"
      footer={
        <>
          Already have an account? <AuthFooterLink href="/login" label="Log in" />
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <AuthInput
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AuthInput
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Signing up…" : "Sign up"}
        </Button>
      </form>
    </AuthCard>
  );
}
