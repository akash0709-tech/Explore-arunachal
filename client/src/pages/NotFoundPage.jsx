// 404 for any address the app does not know.
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { ButtonLink } from "../components/ui/Button.jsx";

export default function NotFoundPage() {
  return (
    <>
      <PageHeader eyebrow="404" title="This trail does not exist" />
      <section className="container section">
        <EmptyState
          icon="compass"
          title="Page not found"
          action={<ButtonLink to="/">Back to home</ButtonLink>}
        >
          The page may have moved, or the link may be wrong.
        </EmptyState>
      </section>
    </>
  );
}
