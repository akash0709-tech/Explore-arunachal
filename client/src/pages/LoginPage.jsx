// Log in with email or mobile number + password. Includes the "forgot password" flow.
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useIsPresent } from "framer-motion";
import { AuthLayout } from "../features/auth/AuthLayout.jsx";
import { ForgotPasswordModal } from "../features/auth/ForgotPasswordModal.jsx";
import { loginSchema } from "../features/auth/authSchemas.js";
import { Input } from "../components/ui/Input.jsx";
import { PasswordInput } from "../components/ui/PasswordInput.jsx";
import { Button } from "../components/ui/Button.jsx";
import { getAuthConfig } from "../api/auth.js";
import { api } from "../api/axios.js";
import { useAuth, homeForRole } from "../hooks/useAuth.js";
import { useToast } from "../hooks/useToast.js";
import { getErrorMessage } from "../utils/apiErrors.js";

export default function LoginPage() {
  const { user, login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const fromLocation = location.state?.from;
  const from = fromLocation?.pathname
    ? `${fromLocation.pathname}${fromLocation.search ?? ""}${fromLocation.hash ?? ""}`
    : undefined;
  const isPresent = useIsPresent();
  const [forgotOpen, setForgotOpen] = useState(false);

  // Show "Continue with Google" only when the API says it is switched on
  const { data: config } = useQuery({
    queryKey: ["auth", "config"],
    queryFn: getAuthConfig,
    staleTime: Infinity
  });

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { identifier: "", password: "" } });

  // Already logged in (e.g. pressed Back): go to the right home page.
  // Not while this page is fading out after logging in (onSubmit already navigated).
  if (user) return isPresent ? <Navigate to={from ?? homeForRole(user.role)} replace /> : null;

  const onSubmit = async (values) => {
    try {
      const loggedIn = await login(values);
      toast({ title: `Welcome back, ${loggedIn.name.split(" ")[0]}` });
      navigate(from ?? homeForRole(loggedIn.role), { replace: true });
    } catch (error) {
      setError("root", { message: getErrorMessage(error) });
    }
  };

  return (
    <AuthLayout>
      <div className="stack" style={{ gap: "var(--sp-2)" }}>
        <p className="page-header__eyebrow">Explore Arunachal</p>
        <h1>Welcome back</h1>
        <p className="text-muted">Log in to see your saved trips, or manage your homestay.</p>
      </div>

      <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input
          label="Email or mobile number"
          autoComplete="username"
          required
          error={errors.identifier?.message}
          {...register("identifier")}
        />
        <PasswordInput
          autoComplete="current-password"
          required
          error={errors.password?.message}
          {...register("password")}
        />
        <button type="button" className="link-btn" onClick={() => setForgotOpen(true)}>
          Forgot password?
        </button>

        {errors.root && (
          <p className="form-error" role="alert">
            {errors.root.message}
          </p>
        )}

        <Button type="submit" size="lg" block loading={isSubmitting}>
          Log in
        </Button>

        {config?.googleAuthEnabled && (
          <>
            <p className="divider">or</p>
            <a className="btn btn--ghost btn--lg btn--block" href={`${api.defaults.baseURL}/auth/google`}>
              Continue with Google
            </a>
          </>
        )}
      </form>

      <p className="text-muted">
        New here? <Link to="/signup">Create an account</Link>
      </p>

      {/* Mounted only while open, so it always starts from the first step */}
      {forgotOpen && (
        <ForgotPasswordModal
          open
          initialEmail={getValues("identifier").includes("@") ? getValues("identifier") : ""}
          onClose={() => setForgotOpen(false)}
          onDone={(email) => {
            setValue("identifier", email);
            setValue("password", "");
            toast({ title: "Password updated", message: "Log in with your new password." });
          }}
        />
      )}
    </AuthLayout>
  );
}
