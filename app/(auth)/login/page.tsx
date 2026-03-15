"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (otpError) {
      setError(otpError.message);
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border border-zinc-200">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-zinc-900">
            BidBoard
          </CardTitle>
          <CardDescription className="text-zinc-500">
            {submitted
              ? "Check your email"
              : "Sign in to manage your contractor bids"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <p className="text-sm text-zinc-700">
              We sent a magic link to{" "}
              <span className="font-medium text-zinc-900">{email}</span>. Click
              it to sign in.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                type="submit"
                className="w-full h-9 px-4 rounded-md bg-indigo-600 hover:bg-indigo-700"
                disabled={loading}
              >
                {loading ? "Sending…" : "Send Magic Link"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
