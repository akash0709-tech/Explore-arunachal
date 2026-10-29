// Temporary body for pages that are built in later tasks.
import { EmptyState } from "../ui/EmptyState.jsx";

export function ComingSoon({ children = "This page is being built." }) {
  return (
    <section className="container section">
      <EmptyState icon="compass" title="Coming soon">
        {children}
      </EmptyState>
    </section>
  );
}
