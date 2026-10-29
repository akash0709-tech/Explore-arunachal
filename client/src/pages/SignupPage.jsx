// Create an account with required email and mobile number fields.
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { AuthLayout } from "../features/auth/AuthLayout.jsx";
import { RoleCards } from "../features/auth/RoleCards.jsx";
import { PasswordStrengthMeter } from "../features/auth/PasswordStrengthMeter.jsx";
import { signupSchema } from "../features/auth/authSchemas.js";
import { Input } from "../components/ui/Input.jsx";
import { PasswordInput } from "../components/ui/PasswordInput.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import { createDraft } from "../api/host.js";
import { useAuth, homeForRole } from "../hooks/useAuth.js";
import { useToast } from "../hooks/useToast.js";
import { getErrorMessage, getFieldErrors } from "../utils/apiErrors.js";

// API field names -> form fields, so server errors appear under the right input
const FORM_FIELDS = ["role", "name", "email", "phone", "password", "acceptedTerms"];

export default function SignupPage() {
  const { user, signup } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isPresent = useIsPresent();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: "traveller", name: "", email: "", phone: "", password: "", acceptedTerms: false }
  });
  const [role, password] = watch(["role", "password"]);

  // True from "Create account" until we have navigated away. The new user is stored
  // before we navigate, and without this the "already logged in" redirect below would
  // send a new traveller home instead of to /plan (or a host before their draft exists).
  const signingUp = useRef(false);

  if (user && !signingUp.current) return isPresent ? <Navigate to={homeForRole(user.role)} replace /> : null;

  const onSubmit = async (values) => {
    signingUp.current = true;
    try {
      const created = await signup(values);
      toast({ title: `Welcome, ${created.name.split(" ")[0]}!`, message: "Your account is ready." });

      if (created.role === "host") {
        // Hosts go straight into the registration wizard with a fresh draft
        try {
          const draft = await createDraft();
          navigate(`/host/register/${draft.id}`, { replace: true });
        } catch {
          navigate("/host/register", { replace: true });
        }
      } else {
        navigate("/plan", { replace: true });
      }
    } catch (error) {
      signingUp.current = false;
      const fieldErrors = getFieldErrors(error);
      let placed = false;
      for (const [field, message] of Object.entries(fieldErrors)) {
        if (FORM_FIELDS.includes(field)) {
          setError(field, { message });
          placed = true;
        }
      }
      if (!placed) setError("root", { message: getErrorMessage(error) });
    }
  };

  return (
    <AuthLayout>
      <div className="stack" style={{ gap: "var(--sp-2)" }}>
        <p className="page-header__eyebrow">Join Explore Arunachal</p>
        <h1>Create your account</h1>
        <p className="text-muted">Enter your email and mobile number to create your account.</p>
      </div>

      <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Controller
          name="role"
          control={control}
          render={({ field }) => <RoleCards value={field.value} onChange={field.onChange} />}
        />
        <AnimatePresence initial={false}>
          {role === "host" && (
            <motion.p
              className="note"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Icon name="info" size={18} />
              After creating your account, you&apos;ll register your property and upload documents.
            </motion.p>
          )}
        </AnimatePresence>

        <Input
          label="Full name"
          autoComplete="name"
          required
          error={errors.name?.message}
          {...register("name")}
        />

        <Input
          label="Email"
          type="email"
          required
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Mobile number"
          type="tel"
          required
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="98765 43210"
          error={errors.phone?.message}
          {...register("phone")}
        />

        <PasswordInput
          autoComplete="new-password"
          required
          hint="At least 8 characters with a number."
          error={errors.password?.message}
          {...register("password")}
        >
          <PasswordStrengthMeter password={password} />
        </PasswordInput>

        <div className="field">
          <label className="checkbox">
            <input
              type="checkbox"
              aria-invalid={errors.acceptedTerms ? true : undefined}
              {...register("acceptedTerms")}
            />
            <span>
              I agree to the terms and understand that Explore Arunachal does not issue permits; it only gives
              estimates.
            </span>
          </label>
          {errors.acceptedTerms && (
            <p className="field__error" role="alert">
              <Icon name="alert" size={16} />
              {errors.acceptedTerms.message}
            </p>
          )}
        </div>

        {errors.root && (
          <p className="form-error" role="alert">
            {errors.root.message}
          </p>
        )}

        <Button type="submit" size="lg" block loading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="text-muted">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}
