// Split layout for login and signup: illustration on the left, the form on the right.
// On phones the illustration becomes a short banner above the form.
import { AuthIllustration } from "./AuthIllustration.jsx";

export function AuthLayout({ children }) {
  return (
    <div className="auth">
      <aside className="auth-art on-band">
        <AuthIllustration />
        <blockquote className="auth-art__quote">
          <p>“Your trip, your permit notes and your host&apos;s number, ready before the signal drops.”</p>
        </blockquote>
      </aside>
      <section className="auth__panel">
        <div className="auth__form">{children}</div>
      </section>
    </div>
  );
}
