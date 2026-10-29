import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { listPermitRules, updatePermitRule, verifyPermitRule } from "../api/admin.js";
import { Button } from "../components/ui/Button.jsx";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { Pill } from "../components/ui/Pill.jsx";
import { AdminQueryError, AdminLoadingRows } from "../features/admin/AdminShared.jsx";
import { formatDate } from "../utils/format.js";
import { useToast } from "../hooks/useToast.js";
import { getErrorMessage } from "../utils/apiErrors.js";

const permitSchema = z.object({
  title: z.string().trim().min(1, "Enter a permit title").max(120),
  whoNeedsIt: z.string().trim().min(1, "Explain who needs this permit").max(300),
  documents: z.array(z.string().trim().min(1).max(200)).max(20),
  steps: z.array(z.string().trim().min(1).max(300)).max(20),
  officialUrl: z.string().trim().url("Enter a valid HTTPS URL").refine((value) => value.startsWith("https://"), "The official portal must use HTTPS"),
  officialLabel: z.string().trim().min(1, "Enter the link label").max(80),
  notes: z.string().trim().max(1000)
});

function formFromRule(rule) {
  return {
    title: rule.title || "",
    whoNeedsIt: rule.whoNeedsIt || "",
    documents: (rule.documents || []).join("\n"),
    steps: (rule.steps || []).join("\n"),
    officialUrl: rule.officialUrl || "",
    officialLabel: rule.officialLabel || "",
    notes: rule.notes || ""
  };
}

function payloadFromForm(form) {
  return {
    title: form.title,
    whoNeedsIt: form.whoNeedsIt,
    documents: form.documents.split("\n").map((item) => item.trim()).filter(Boolean),
    steps: form.steps.split("\n").map((item) => item.trim()).filter(Boolean),
    officialUrl: form.officialUrl,
    officialLabel: form.officialLabel,
    notes: form.notes
  };
}

export default function AdminPermitsPage() {
  const [editing, setEditing] = useState({});
  const [forms, setForms] = useState({});
  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const query = useQuery({ queryKey: ["admin", "permits"], queryFn: listPermitRules });
  const saveMutation = useMutation({
    mutationFn: ({ id, changes }) => updatePermitRule(id, changes),
    onSuccess: async (rule) => {
      queryClient.setQueryData(["admin", "permits"], (current = []) => current.map((item) => item._id === rule._id ? rule : item));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["permits"] })
      ]);
      setEditing((current) => ({ ...current, [rule._id]: false }));
      toast({ title: "Permit rule updated", message: "The change is saved but has not been marked verified." });
    },
    onError: (error) => toast({ tone: "bad", title: "Could not update permit rule", message: getErrorMessage(error) })
  });
  const verifyMutation = useMutation({
    mutationFn: verifyPermitRule,
    onSuccess: async (rule) => {
      queryClient.setQueryData(["admin", "permits"], (current = []) => current.map((item) => item._id === rule._id ? rule : item));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["permits"] })
      ]);
      toast({ title: `${rule.code} marked verified today` });
    },
    onError: (error) => toast({ tone: "bad", title: "Could not verify permit rule", message: getErrorMessage(error) })
  });
  const setField = (id, name, value) => {
    setForms((current) => ({ ...current, [id]: { ...current[id], [name]: value } }));
    setErrors((current) => ({ ...current, [id]: { ...current[id], [name]: "" } }));
  };
  const beginEdit = (rule) => {
    setForms((current) => ({ ...current, [rule._id]: formFromRule(rule) }));
    setErrors((current) => ({ ...current, [rule._id]: {} }));
    setEditing((current) => ({ ...current, [rule._id]: true }));
  };
  const save = (rule) => {
    const parsed = permitSchema.safeParse(payloadFromForm(forms[rule._id]));
    if (!parsed.success) {
      setErrors((current) => ({
        ...current,
        [rule._id]: Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message]))
      }));
      return;
    }
    saveMutation.mutate({ id: rule._id, changes: parsed.data });
  };

  return (
    <>
      <PageHeader eyebrow="Tourism review team" title="Permit data" subtitle="Keep permit requirements and official links accurate for travellers." />
      <section className="container section admin-content">
        <p className="admin-permit-warning">Editing a rule updates the traveller Permit Wizard. Mark it verified only after checking the official source.</p>
        {query.isError ? <AdminQueryError error={query.error} onRetry={() => query.refetch()} /> : query.isLoading ? <AdminLoadingRows count={3} /> : (
          <div className="admin-permit-list">{query.data.map((rule) => {
            const isEditing = Boolean(editing[rule._id]);
            const form = forms[rule._id] ?? formFromRule(rule);
            const fieldErrors = errors[rule._id] ?? {};
            return (
              <article className="admin-card admin-permit-card" key={rule._id}>
                <header className="admin-card__heading">
                  <div><p className="page-header__eyebrow">{rule.appliesTo === "all" ? "All travellers" : `${rule.appliesTo} travellers`}</p><h2>{rule.code} · {rule.title}</h2></div>
                  <Pill tone={rule.stale ? "warn" : "ok"}>{rule.stale ? "Older than 30 days" : "Fresh"}</Pill>
                </header>
                <div className="admin-permit-freshness"><span>Last verified: <strong>{rule.lastVerifiedAt ? formatDate(rule.lastVerifiedAt) : "Never"}</strong></span>{rule.verifiedBy?.name && <span>by {rule.verifiedBy.name}</span>}{rule.daysSinceVerified != null && <span>{rule.daysSinceVerified} days ago</span>}</div>
                {!isEditing ? (
                  <>
                    <p>{rule.whoNeedsIt}</p>
                    <div className="admin-permit-columns">
                      <div><h3>Documents</h3><ul>{(rule.documents ?? []).map((item) => <li key={item}>{item}</li>)}</ul></div>
                      <div><h3>Steps</h3><ol>{(rule.steps ?? []).map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ol></div>
                    </div>
                    {rule.notes && <p className="text-muted">{rule.notes}</p>}
                    {rule.officialUrl && <a href={rule.officialUrl} target="_blank" rel="noreferrer">{rule.officialLabel || "Official source"}</a>}
                    <div className="row admin-permit-actions"><Button variant="ghost" onClick={() => beginEdit(rule)}>Edit</Button><Button loading={verifyMutation.isPending && verifyMutation.variables === rule._id} onClick={() => verifyMutation.mutate(rule._id)}>Mark verified today</Button></div>
                  </>
                ) : (
                  <div className="admin-permit-editor">
                    <label className="field"><span className="field__label">Title</span><input className="input" value={form.title} onChange={(event) => setField(rule._id, "title", event.target.value)} />{fieldErrors.title && <span className="field__error">{fieldErrors.title}</span>}</label>
                    <label className="field"><span className="field__label">Who needs it</span><textarea className="input admin-note" rows={3} value={form.whoNeedsIt} onChange={(event) => setField(rule._id, "whoNeedsIt", event.target.value)} />{fieldErrors.whoNeedsIt && <span className="field__error">{fieldErrors.whoNeedsIt}</span>}</label>
                    <label className="field"><span className="field__label">Documents (one per line)</span><textarea className="input admin-note" rows={4} value={form.documents} onChange={(event) => setField(rule._id, "documents", event.target.value)} />{fieldErrors.documents && <span className="field__error">{fieldErrors.documents}</span>}</label>
                    <label className="field"><span className="field__label">Application steps (one per line)</span><textarea className="input admin-note" rows={4} value={form.steps} onChange={(event) => setField(rule._id, "steps", event.target.value)} />{fieldErrors.steps && <span className="field__error">{fieldErrors.steps}</span>}</label>
                    <div className="host-form-grid">
                      <label className="field"><span className="field__label">Official URL (HTTPS)</span><input className="input" type="url" value={form.officialUrl} onChange={(event) => setField(rule._id, "officialUrl", event.target.value)} />{fieldErrors.officialUrl && <span className="field__error">{fieldErrors.officialUrl}</span>}</label>
                      <label className="field"><span className="field__label">Link label</span><input className="input" value={form.officialLabel} onChange={(event) => setField(rule._id, "officialLabel", event.target.value)} />{fieldErrors.officialLabel && <span className="field__error">{fieldErrors.officialLabel}</span>}</label>
                    </div>
                    <label className="field"><span className="field__label">Notes for travellers</span><textarea className="input admin-note" rows={3} value={form.notes} onChange={(event) => setField(rule._id, "notes", event.target.value)} />{fieldErrors.notes && <span className="field__error">{fieldErrors.notes}</span>}</label>
                    <div className="row"><Button variant="ghost" onClick={() => setEditing((current) => ({ ...current, [rule._id]: false }))}>Cancel</Button><Button loading={saveMutation.isPending && saveMutation.variables?.id === rule._id} onClick={() => save(rule)}>Save permit rule</Button></div>
                  </div>
                )}
              </article>
            );
          })}</div>
        )}
      </section>
    </>
  );
}
