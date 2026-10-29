// Development-only gallery of every UI component (/dev/ui).
// Only routed when running `npm run dev`. REMOVE before submission.
import { useState } from "react";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import {
  Button,
  Input,
  Select,
  Textarea,
  Chip,
  ChipGroup,
  Stepper,
  Card,
  Pill,
  Tabs,
  Modal,
  ConfirmInline,
  OtpInput,
  FileDropzone,
  Skeleton,
  EmptyState,
  ProgressSteps
} from "../components/ui/index.js";
import { useToast } from "../hooks/useToast.js";

const INTERESTS = ["Monasteries", "Lakes", "Treks", "Food", "Festivals"];

function Section({ title, children }) {
  return (
    <Card className="stack">
      <h3>{title}</h3>
      {children}
    </Card>
  );
}

export default function DevUiPage() {
  const { toast } = useToast();
  const [interests, setInterests] = useState(["Lakes"]);
  const [travellers, setTravellers] = useState(2);
  const [tab, setTab] = useState("pending");
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(2);

  const toggle = (name) =>
    setInterests((list) => (list.includes(name) ? list.filter((i) => i !== name) : [...list, name]));

  return (
    <>
      <PageHeader
        eyebrow="Development only"
        title="UI components"
        subtitle="Every shared component in one place. Remove this page before submission."
      >
        <ProgressSteps steps={["Basics", "Photos", "Rooms", "Approvals", "Proof", "Review"]} current={step} />
      </PageHeader>

      <section className="container section dev-grid">
        <Section title="Buttons">
          <div className="row">
            <Button>Primary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="dark">Dark</Button>
            <Button variant="success">Success</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div className="row">
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button
              loading={loading}
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 1500);
              }}
            >
              Click to load
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="Inputs">
          <Input label="Homestay name" placeholder="Sangti Riverside Homestay" required />
          <Input label="Mobile number" hint="10 digits, no +91" inputMode="numeric" />
          <Input label="Email" defaultValue="not-an-email" error="Enter a valid email address" />
          <Select
            label="Start city"
            placeholder="Choose a start city"
            options={[
              { value: "guwahati", label: "Guwahati" },
              { value: "itanagar", label: "Itanagar" }
            ]}
          />
          <Textarea label="Description" maxLength={300} placeholder="What makes your homestay special?" />
        </Section>

        <Section title="Chips, stepper, pills">
          <ChipGroup label="Interests">
            {INTERESTS.map((name) => (
              <Chip key={name} selected={interests.includes(name)} onToggle={() => toggle(name)}>
                {name}
              </Chip>
            ))}
          </ChipGroup>
          <Stepper label="Travellers" value={travellers} onChange={setTravellers} min={1} max={20} />
          <Stepper label="Wizard step" value={step} onChange={setStep} min={1} max={6} />
          <div className="row">
            <Pill tone="ok" icon="check">
              Verified
            </Pill>
            <Pill tone="warn" icon="alert">
              Long drive
            </Pill>
            <Pill tone="bad">Rejected</Pill>
            <Pill>Sample data</Pill>
          </div>
        </Section>

        <Section title="Tabs, modal, confirm, toasts">
          <Tabs
            label="Queue filter"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "pending", label: "Pending", count: 3 },
              { id: "changes", label: "Changes requested" },
              { id: "live", label: "Live" }
            ]}
          />
          <p className="text-muted">Selected tab: {tab}</p>
          <div className="row">
            <Button variant="ghost" onClick={() => setModalOpen(true)}>
              Open modal
            </Button>
            <ConfirmInline
              label="Delete draft"
              message="Delete this draft?"
              confirmLabel="Delete"
              onConfirm={() => toast({ title: "Draft deleted", tone: "mute" })}
            />
          </div>
          <div className="row">
            <Button
              size="sm"
              onClick={() => toast({ title: "Trip saved", message: "It now opens offline." })}
            >
              Toast ok
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toast({ title: "Long drive day", message: "Leave by 6 am.", tone: "warn" })}
            >
              Toast warn
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toast({ title: "Upload failed", message: "Please try again.", tone: "bad" })}
            >
              Toast bad
            </Button>
          </div>
        </Section>

        <Section title="OTP input">
          <OtpInput
            label="Email code"
            value={code}
            onChange={setCode}
            onComplete={(c) => toast({ title: `Code complete: ${c}` })}
            error={code === "000000" ? "Incorrect code" : undefined}
          />
          <p className="text-small text-muted">
            Try typing, pasting "123456", Backspace and arrow keys. "000000" shows the error state.
          </p>
        </Section>

        <Section title="File dropzone">
          <FileDropzone
            label="Add photos"
            accept="image/jpeg,image/png,image/webp"
            multiple
            maxSizeMB={5}
            onFiles={setFiles}
          />
          {files.length > 0 && <p className="text-small">{files.map((f) => f.name).join(", ")}</p>}
        </Section>

        <Section title="Skeleton and empty state">
          <Skeleton height={24} width="50%" />
          <Skeleton lines={3} />
          <EmptyState
            icon="compass"
            title="No saved trips yet"
            action={<Button size="sm">Plan a trip</Button>}
          >
            Trips you save open even without network.
          </EmptyState>
        </Section>

        <Card interactive tabIndex={0} className="stack">
          <h3>Interactive card</h3>
          <p className="text-muted">Lifts on hover. Used for stay and result cards.</p>
        </Card>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Report this listing"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModalOpen(false)}>Send report</Button>
          </>
        }
      >
        <Textarea label="What went wrong?" maxLength={1000} />
      </Modal>
    </>
  );
}
