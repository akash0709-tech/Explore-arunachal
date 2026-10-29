// The Permit Wizard result: which permit, documents (tick list), steps, extra local
// rules, the official link and the date our team last checked the rule.
//
// Ticks live in React state only here; they are saved with a trip once one is saved.
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "../../components/ui/Icon.jsx";
import { Pill } from "../../components/ui/Pill.jsx";
import { buttonClass } from "../../components/ui/buttonClass.js";
import { formatDate, daysSince } from "../../utils/format.js";

const STALE_AFTER_DAYS = 30;

function Stamp({ code }) {
  const label = code ? `${code} required` : "No permit";
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={label}
        className="permit-card__stamp"
        data-tone={code ? "required" : "none"}
        initial={{ opacity: 0, scale: 1.8, rotate: -24 }}
        animate={{ opacity: 1, scale: 1, rotate: -9 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
      >
        {label}
      </motion.span>
    </AnimatePresence>
  );
}

function DocumentChecklist({ documents }) {
  const [done, setDone] = useState(() => new Set());
  const toggle = (index) =>
    setDone((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <section className="permit-card__section" aria-labelledby="permit-docs">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 id="permit-docs">Documents</h3>
        <span className="text-small text-muted numeric" aria-live="polite">
          {done.size} of {documents.length} ready
        </span>
      </div>
      <ul className="checklist">
        {documents.map((document, index) => (
          <li key={document}>
            <label className="checkbox">
              <input type="checkbox" checked={done.has(index)} onChange={() => toggle(index)} />
              <span>{document}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PermitCard({ result, isUpdating }) {
  const { mainPermit, extraRules, disclaimer, destinations } = result;
  const places = destinations.map((d) => d.name).join(", ");
  const age = daysSince(mainPermit?.lastVerifiedAt);

  return (
    <motion.article
      className="permit-card"
      aria-busy={isUpdating || undefined}
      animate={{ opacity: isUpdating ? 0.6 : 1 }}
      aria-labelledby="permit-title"
    >
      <header className="permit-card__header on-band">
        <p className="page-header__eyebrow">For {places}</p>
        <h2 id="permit-title">{mainPermit ? mainPermit.title : "No Arunachal permit needed"}</h2>
        <p className="permit-card__who">
          {mainPermit
            ? mainPermit.whoNeedsIt
            : "None of the places you chose are inside Arunachal Pradesh. Add an Arunachal destination to see its permit."}
        </p>
        <Stamp code={mainPermit?.code} />
      </header>

      {mainPermit && (
        <div className="permit-card__body">
          {/* key: a different permit starts with an empty tick list */}
          <DocumentChecklist key={mainPermit.code} documents={mainPermit.documents} />

          <section className="permit-card__section" aria-labelledby="permit-steps">
            <h3 id="permit-steps">How to get it</h3>
            <ol className="numbered-steps">
              {mainPermit.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {mainPermit.notes && <p className="text-small text-muted">{mainPermit.notes}</p>}
          </section>
        </div>
      )}

      {extraRules.map((rule) => (
        <div key={rule._id} className="permit-card__alert" role="note">
          <Icon name="alert" size={22} />
          <div className="stack" style={{ gap: 6 }}>
            <strong>
              Extra permission for{" "}
              {rule.forDestinations
                .map((slug) => destinations.find((d) => d.slug === slug)?.name ?? slug)
                .join(", ")}
              : {rule.title}
            </strong>
            <p>{rule.whoNeedsIt}</p>
            <ol className="numbered-steps numbered-steps--compact">
              {rule.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      ))}

      {mainPermit && (
        <footer className="permit-card__footer">
          {mainPermit.officialUrl && (
            <a
              className={buttonClass({ variant: "dark" })}
              href={mainPermit.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {mainPermit.officialLabel || "Official portal"}
              <span className="sr-only"> (opens in a new tab)</span>
              <Icon name="chevronRight" size={16} />
            </a>
          )}
          <span className="row text-small" style={{ gap: 8 }}>
            <span>
              Last verified:{" "}
              <strong className="numeric">{formatDate(mainPermit.lastVerifiedAt) || "not yet"}</strong>
            </span>
            {(age === null || age > STALE_AFTER_DAYS) && <Pill tone="warn">Check again</Pill>}
          </span>
        </footer>
      )}

      <p className="permit-card__disclaimer text-small">{disclaimer}</p>
    </motion.article>
  );
}
