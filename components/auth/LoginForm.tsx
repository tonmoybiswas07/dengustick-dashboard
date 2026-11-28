"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = challenge ? `two-factor/${backup ? "verify-backup-code" : "verify-totp"}` : "sign-in/email";
      const response = await fetch(`/api/auth/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(challenge ? { code } : { email, password }),
      });
      if (!response.ok) {
        toast.error(challenge ? "Invalid verification code or expired challenge" : "Invalid email or password");
        return;
      }
      if ((await response.json()).twoFactorRedirect === true) {
        setPassword("");
        setChallenge(true);
        return;
      }

      toast.success("Welcome to DengueVision");

      router.replace("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-3">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck size={30} />
        </div>

        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back
        </h1>

        <p className="text-sm text-muted-foreground">
          Sign in to your DengueVision surveillance dashboard.
        </p>
      </div>

      {challenge ? <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">{backup ? "Recovery code" : "Authenticator code"}
          <Input autoComplete="one-time-code" inputMode={backup ? "text" : "numeric"} value={code} onChange={(event) => setCode(event.target.value)} required maxLength={40} />
        </label>
        <Button disabled={loading} type="submit">{loading ? "Verifying…" : "Verify sign-in"}</Button>
        <Button variant="outline" type="button" onClick={() => { setBackup(!backup); setCode(""); }}>{backup ? "Use authenticator" : "Use recovery code"}</Button>
        <Button variant="ghost" type="button" onClick={() => { setChallenge(false); setCode(""); }}>Back to password</Button>
      </form> : <form onSubmit={handleSubmit} className="space-y-5">
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
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
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
              <Loader2 className="animate-spin" />
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

      <div className="rounded-xl border bg-muted/40 p-4">
        <p className="text-center text-xs text-muted-foreground">
          This platform is restricted to authorized research
          and public health personnel.
        </p>
      </div>
    </div>
  );
}