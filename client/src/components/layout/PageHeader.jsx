// Dark teal band at the top of every page, with faint contour lines.
//   <PageHeader eyebrow="Permit Wizard" title="Which permit do I need?" subtitle="..." actions={<Button/>}>
//     <ProgressSteps ... />      <- optional slot under the title (steps, filters, tabs)
//   </PageHeader>
import { Contours } from "./Contours.jsx";

export function PageHeader({ eyebrow, title, subtitle, actions, children }) {
  return (
    <header className="page-header on-band">
      <Contours />
      <div className="container page-header__inner">
        <div className="page-header__top">
          <div className="stack" style={{ gap: "var(--sp-2)" }}>
            {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
            <h1>{title}</h1>
            {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="row">{actions}</div>}
        </div>
        {children && <div className="page-header__slot">{children}</div>}
      </div>
    </header>
  );
}
