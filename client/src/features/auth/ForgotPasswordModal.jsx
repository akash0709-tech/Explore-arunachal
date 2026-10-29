// Small "forgot password" flow in a dialog, using the real API:
//   1. email          -> POST /auth/password/forgot  (same answer whether or not the account exists)
//   2. 6-digit code   -> POST /auth/otp/verify       (checks the code, does not use it up)
//   3. new password   -> POST /auth/password/reset
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "../../components/ui/Modal.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { PasswordInput } from "../../components/ui/PasswordInput.jsx";
import { OtpInput } from "../../components/ui/OtpInput.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { forgotPassword, verifyOtp, resetPassword } from "../../api/auth.js";
import { useCountdown } from "../../hooks/useCountdown.js";
import { getErrorMessage } from "../../utils/apiErrors.js";
import { emailField, newPasswordSchema } from "./authSchemas.js";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter.jsx";

const TITLES = { email: "Reset your password", code: "Enter the code", password: "Choose a new password" };

export function ForgotPasswordModal({ open, onClose, initialEmail = "", onDone }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const countdown = useCountdown();
  const passwordForm = useForm({ resolver: zodResolver(newPasswordSchema) });

  const close = () => {
    setStep("email");
    setCode("");
    setError("");
    passwordForm.reset();
    onClose();
  };

  const requestCode = async (event) => {
    event?.preventDefault();
    const parsed = emailField.safeParse(email);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true);
    setError("");
    try {
      await forgotPassword({ email: parsed.data });
      setEmail(parsed.data);
      setCode("");
      setStep("code");
      countdown.start(30);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const checkCode = async (fullCode) => {
    setBusy(true);
    setError("");
    try {
      await verifyOtp({ channel: "email", target: email, purpose: "reset", code: fullCode });
      setStep("password");
    } catch (err) {
      setError(getErrorMessage(err));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const savePassword = passwordForm.handleSubmit(async ({ password }) => {
    setError("");
    try {
      await resetPassword({ email, code, newPassword: password });
      onDone(email);
      close();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  });

  return (
    <Modal open={open} onClose={close} title={TITLES[step]}>
      {step === "email" && (
        <form className="stack" onSubmit={requestCode} noValidate>
          <p>Enter the email you signed up with. If it has an account, we&apos;ll send a 6-digit code.</p>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
          />
          <Button type="submit" block loading={busy}>
            Send code
          </Button>
        </form>
      )}

      {step === "code" && (
        <div className="stack">
          <p>If {email} has an account, a code is on its way. It expires in 10 minutes.</p>
          <OtpInput
            label="Reset code"
            value={code}
            onChange={setCode}
            onComplete={checkCode}
            error={error}
            disabled={busy}
          />
          <Button variant="ghost" size="sm" disabled={countdown.isRunning || busy} onClick={requestCode}>
            {countdown.isRunning ? `Resend in ${countdown.secondsLeft} s` : "Resend code"}
          </Button>
        </div>
      )}

      {step === "password" && (
        <form className="stack" onSubmit={savePassword} noValidate>
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            required
            error={passwordForm.formState.errors.password?.message}
            {...passwordForm.register("password")}
          >
            <PasswordStrengthMeter password={passwordForm.watch("password")} />
          </PasswordInput>
          <PasswordInput
            label="Repeat new password"
            autoComplete="new-password"
            required
            error={passwordForm.formState.errors.confirm?.message}
            {...passwordForm.register("confirm")}
          />
          {error && (
            <p className="field__error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" block loading={passwordForm.formState.isSubmitting}>
            Save new password
          </Button>
        </form>
      )}
    </Modal>
  );
}
