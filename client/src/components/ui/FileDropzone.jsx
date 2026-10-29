// Drag & drop area that also works with click, Enter or Space.
// It checks type and size in the browser for quick feedback; the API checks again
// (including the real file type), so this is only a convenience.
//   <FileDropzone label="Add photos" accept="image/jpeg,image/png,image/webp" multiple maxSizeMB={5} onFiles={upload} />
import { useId, useRef, useState } from "react";
import { Icon } from "./Icon.jsx";

const matchesAccept = (file, accept) => {
  if (!accept) return true;
  return accept.split(",").some((type) => {
    const rule = type.trim();
    if (rule.endsWith("/*")) return file.type.startsWith(rule.slice(0, -1));
    if (rule.startsWith(".")) return file.name.toLowerCase().endsWith(rule);
    return file.type === rule;
  });
};

export function FileDropzone({
  label,
  hint,
  accept,
  multiple = false,
  maxFiles = 10,
  maxSizeMB = 5,
  onFiles,
  disabled = false
}) {
  const inputRef = useRef(null);
  const hintId = useId();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = (fileList) => {
    const files = [...fileList];
    if (files.length === 0) return;
    if (!multiple && files.length > 1) return setError("Please choose one file.");
    if (files.length > maxFiles) return setError(`Choose at most ${maxFiles} files.`);
    const wrongType = files.find((file) => !matchesAccept(file, accept));
    if (wrongType) return setError(`${wrongType.name} is not an allowed file type.`);
    const tooBig = files.find((file) => file.size > maxSizeMB * 1024 * 1024);
    if (tooBig) return setError(`${tooBig.name} is larger than ${maxSizeMB} MB.`);
    setError("");
    onFiles(files);
  };

  const open = () => !disabled && inputRef.current?.click();

  return (
    <div className="field">
      <div
        className="dropzone"
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-describedby={hintId}
        data-dragging={dragging}
        onClick={open}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) handleFiles(event.dataTransfer.files);
        }}
      >
        <span className="dropzone__icon">
          <Icon name="upload" size={28} />
        </span>
        <strong>{label}</strong>
        <span id={hintId} className="text-small text-muted">
          {hint ?? `Drag files here or click to choose. Up to ${maxSizeMB} MB each.`}
        </span>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={accept}
          multiple={multiple}
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = ""; // allow choosing the same file again
          }}
        />
      </div>
      {error && (
        <p className="field__error" role="alert">
          <Icon name="alert" size={16} />
          {error}
        </p>
      )}
    </div>
  );
}
