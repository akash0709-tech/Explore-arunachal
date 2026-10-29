// Email or mobile field with "Send OTP" and the 6-box code that appears underneath.
//
// Flow: type the address -> Send OTP -> enter 6 digits -> the code is checked
// automatically -> green "Verified" tick. The short-lived verification token goes to
// the parent through onVerified() and lives in React state only (never in storage).
// Changing the email/number afterwards makes it unverified again.
import { forwardRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Field } from "../../components/ui/Field.jsx";
import { useFieldIds, describedBy } from "../../components/ui/fieldIds.js";
import { Button } from "../../components/ui/Button.jsx";
import { OtpInput } from "../../components/ui/OtpInput.jsx";
import { Pill } from "../../components/ui/Pill.jsx";
import { sendOtp, verifyOtp } from "../../api/auth.js";
import { useCountdown } from "../../hooks/useCountdown.js";
import { getErrorMessage } from "../../utils/apiErrors.js";
import { isValidTarget, cleanTarget } from "./authSchemas.js";

export const ContactVerifier = forwardRef(function ContactVerifier(
  { channel, label, value, error, onServerError, verification, onVerified, prefix, ...inputProps },
  ref
) {
  const { fieldId, hintId, errorId } = useFieldIds();
  const countdown = useCountdown();
  const [sentTo, setSentTo] = useState(null); // the address the last code went to
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const target = cleanTarget(channel, value);
  const verified = verification?.target === target && Boolean(verification?.token);
  const codeVisible = !verified && sentTo === target;
  const what = channel === "email" ? "email" : "mobile number";

  const send = async () => {
    setSending(true);
    setCodeError("");
    try {
      const { resendAfterSeconds } = await sendOtp({ channel, target, purpose: "signup" });
      setSentTo(target);
      setCode("");
      countdown.start(resendAfterSeconds ?? 30);
    } catch (err) {
      onServerError(getErrorMessage(err)); // e.g. "This email is already registered"
    } finally {
      setSending(false);
    }
  };

  const verify = async (fullCode) => {
    setVerifying(true);
    setCodeError("");
    try {
      const { verificationToken } = await verifyOtp({
        channel,
        target: sentTo,
        purpose: "signup",
        code: fullCode
      });
      onVerified({ target: sentTo, token: verificationToken });
    } catch (err) {
      setCodeError(getErrorMessage(err));
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  const hint = verified ? undefined : `We'll send a 6-digit code to this ${what}.`;

  return (
    <div className="stack" style={{ gap: "var(--sp-3)" }}>
      <Field
        label={
          <span className="row" style={{ gap: 8 }}>
            {label}
            {verified && (
              <Pill tone="ok" icon="check">
                Verified
              </Pill>
            )}
          </span>
        }
        required
        hint={hint}
        error={error}
        fieldId={fieldId}
        hintId={hintId}
        errorId={errorId}
      >
        <div className="input-affix">
          {prefix && (
            <span className="input-affix__prefix" aria-hidden="true">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={fieldId}
            className="input"
            aria-invalid={error ? true : undefined}
            aria-required
            aria-describedby={describedBy({ hint, error, hintId, errorId })}
            {...inputProps}
          />
          {!verified && (
            <Button
              size="sm"
              variant={codeVisible ? "ghost" : "dark"}
              className="input-affix__action"
              loading={sending}
              disabled={!isValidTarget(channel, value) || countdown.isRunning}
              onClick={send}
            >
              {codeVisible ? "Resend" : "Send OTP"}
            </Button>
          )}
        </div>
      </Field>

      <AnimatePresence initial={false}>
        {codeVisible && (
          <motion.div
            className="otp-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="otp-panel__inner">
              <OtpInput
                label={`Code sent to ${channel === "mobile" ? `+91 ${sentTo}` : sentTo}`}
                value={code}
                onChange={setCode}
                onComplete={verify}
                error={codeError}
                disabled={verifying}
              />
              <p className="text-small text-muted" aria-live="polite">
                {verifying
                  ? "Checking…"
                  : countdown.isRunning
                    ? `You can ask for a new code in ${countdown.secondsLeft} s`
                    : "Didn't get it? Use Resend above."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
