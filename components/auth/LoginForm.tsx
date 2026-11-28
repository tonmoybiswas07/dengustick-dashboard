"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [challenge, setChallenge] = useState(false);
  const [backup, setBackup] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = challenge ? `two-factor/${backup ? "verify-backup-code" : "verify-totp"}` : "sign-in/email";
      const response = await fetch(`/api/auth/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(challenge ? { code } : { email, password }),
      });
      if (!response.ok) {
        setError(challenge ? "Invalid verification code or expired challenge" : "Invalid email or password");
        return;
      }
      if ((await response.json()).twoFactorRedirect === true) {
        setPassword("");
        setChallenge(true);
        return;
      }

      toast.success("Signed in");

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{challenge ? "Verify your sign-in" : "Sign in"}</h1>
        <p className="text-sm text-muted-foreground">
          {challenge ? (backup ? "Enter an unused recovery code." : "Enter the code from your authenticator app.")
            : "Use your authorized research or public health account."}
        </p>
      </div>

      {error && <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/8 p-3 text-sm text-destructive">{error}</p>}
      {challenge ? <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-4">
        <label className="block">{backup ? "Recovery code" : "Authenticator code"}
          <Input autoFocus className="mt-1 h-11" autoComplete="one-time-code" inputMode={backup ? "text" : "numeric"} value={code} onChange={(event) => setCode(event.target.value)} required maxLength={40} />
        </label>
        <div className="grid gap-2 sm:flex sm:flex-wrap">
        <Button disabled={loading} type="submit">{loading ? "Verifying…" : "Verify sign-in"}</Button>
        <Button variant="outline" type="button" onClick={() => { setBackup(!backup); setCode(""); setError(""); }}>{backup ? "Use authenticator" : "Use recovery code"}</Button>
        <Button variant="ghost" type="button" onClick={() => { setChallenge(false); setCode(""); setError(""); }}>Back to password</Button>
        </div>
      </form> : <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email address
          </label>

          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="h-12"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>

          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="h-12 pr-12"
              required
            />

            <button
              type="button"
              aria-label={
                showPassword ? "Hide password" : "Show password"
              }
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded text-muted-foreground"
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full"
        >
          {loading ? (
            <>
              <Loader2 className="motion-safe:animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight size={17} />
            </>
          )}
        </Button>
      </form>}

      {!challenge && <Link href="/forgot-password" className="inline-block text-sm text-primary underline underline-offset-4">Forgot password?</Link>}
    </div>
  );
}