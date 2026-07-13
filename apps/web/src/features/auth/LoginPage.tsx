import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadifyMark } from "@/components/TenantBrand";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/apiClient";
import { supabase } from "@/lib/supabaseClient";

const RESEND_COOLDOWN_SECONDS = 30;
/** Supabase magic-link OTPs for this project are 8 digits (not 6). */
const OTP_LENGTH = 8;

export function LoginPage() {
  const { session } = useAuth();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Always clear any leftover session so Sign in never skips the OTP form.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await supabase.auth.signOut();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const requestCode = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post("/public/auth/otp/request", { email });
      setStep("code");
      setCode("");
      startCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send sign-in code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await requestCode();
  };

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      // Must match generateLink({ type: "magiclink" }) on the API — type "email" rejects these tokens.
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "magiclink",
      });
      if (verifyError) throw verifyError;
      // onAuthStateChange in useAuth picks up the resulting session automatically.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired code");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only redirect after a successful OTP — never from a leftover password session.
  if (ready && session) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <LeadifyMark className="mb-3 h-24 w-24" />
          <CardTitle className="sr-only">Leadify</CardTitle>
          <CardDescription>
            {!ready
              ? "Preparing sign-in..."
              : step === "email"
                ? "Sign in with your work email. We'll send you a one-time code. New accounts are invite-only."
                : `Enter the ${OTP_LENGTH}-digit code sent to ${email}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <p className="text-center text-sm text-muted-foreground">Clearing previous session...</p>
          ) : step === "email" ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting || !email.trim()}>
                {isSubmitting ? "Sending code..." : "Send sign-in code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="otp-code">{OTP_LENGTH}-digit code</Label>
                <Input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  autoFocus
                  maxLength={OTP_LENGTH}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                  placeholder={"0".repeat(OTP_LENGTH)}
                  className="text-center text-lg tracking-[0.3em]"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting || code.length !== OTP_LENGTH}>
                {isSubmitting ? "Verifying..." : "Verify & sign in"}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError(null);
                  }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Change email
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={cooldown > 0 || isSubmitting}
                  onClick={() => void requestCode()}
                >
                  {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
