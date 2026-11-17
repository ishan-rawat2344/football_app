/**
 * Form building blocks, sized for thumbs: 48px targets, 17px text (so iOS
 * doesn't zoom in on focus), and steppers instead of tiny number inputs.
 */
import { useId, type ReactNode } from 'react';
import { Link } from 'wouter';

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="back-link">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m15 5-7 7 7 7" />
      </svg>
      {label}
    </Link>
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: 'text' | 'date' | 'time';
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input
        id={id}
        className="input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <textarea
        id={id}
        className="input input--area"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

/** Optional number: empty input means "not set" (null). */
export function NumberInput({
  label,
  value,
  onChange,
  unit,
  hint,
  step = 1,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  unit?: string;
  hint?: string;
  step?: number;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <div className="input-unit">
        <input
          id={id}
          className="input"
          type="number"
          inputMode="decimal"
          step={step}
          value={value ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '') return onChange(null);
            const n = Number(v);
            if (Number.isFinite(n)) onChange(n);
          }}
        />
        {unit && <span className="input-unit__label">{unit}</span>}
      </div>
    </Field>
  );
}

/** Whole numbers with − / + buttons, for small counts like sessions per week. */
export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 99,
  hint,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  hint?: string;
  unit?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="stepper">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <output aria-live="polite">
          {value}
          {unit && <span className="stepper__unit"> {unit}</span>}
        </output>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </button>
      </div>
    </Field>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="segmented" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

/** Multi-select as tappable chips. */
export function Chips<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T[];
  options: { key: T; label: string }[];
  onChange: (v: T[]) => void;
  hint?: string;
}) {
  const toggle = (k: T) =>
    onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <Field label={label} hint={hint}>
      <div className="chips" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            className="chip"
            aria-pressed={value.includes(o.key)}
            onClick={() => toggle(o.key)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

/** Edit a list of short texts: goals, weapons, cue words… */
export function ListEditor({
  label,
  items,
  onChange,
  placeholder,
  addLabel = 'Add',
  hint,
  multiline = true,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  hint?: string;
  multiline?: boolean;
}) {
  const set = (i: number, v: string) => onChange(items.map((x, j) => (j === i ? v : x)));
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));
  return (
    <Field label={label} hint={hint}>
      <div className="list-editor">
        {items.map((item, i) => (
          <div className="list-editor__row" key={i}>
            {multiline ? (
              <textarea
                className="input input--area"
                rows={2}
                value={item}
                placeholder={placeholder}
                aria-label={`${label} ${i + 1}`}
                onChange={(e) => set(i, e.target.value)}
              />
            ) : (
              <input
                className="input"
                value={item}
                placeholder={placeholder}
                aria-label={`${label} ${i + 1}`}
                onChange={(e) => set(i, e.target.value)}
              />
            )}
            <button type="button" className="remove-btn" aria-label={`Remove ${label} ${i + 1}`} onClick={() => remove(i)}>
              ×
            </button>
          </div>
        ))}
        <button type="button" className="btn btn--ghost" onClick={() => onChange([...items, ''])}>
          + {addLabel}
        </button>
      </div>
    </Field>
  );
}

/** Edit a list of small records with two text fields each (role models, if → then plans). */
export function PairListEditor<T extends object>({
  label,
  items,
  onChange,
  fields,
  makeEmpty,
  addLabel = 'Add',
  hint,
}: {
  label: string;
  items: T[];
  onChange: (v: T[]) => void;
  fields: { key: keyof T & string; label: string; placeholder?: string }[];
  makeEmpty: () => T;
  addLabel?: string;
  hint?: string;
}) {
  const set = (i: number, key: keyof T, v: string) =>
    onChange(items.map((x, j) => (j === i ? { ...x, [key]: v } : x)));
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));
  return (
    <Field label={label} hint={hint}>
      <div className="list-editor">
        {items.map((item, i) => (
          <div className="pair-row" key={i}>
            {fields.map((f) => (
              <label key={f.key} className="pair-row__field">
                <span>{f.label}</span>
                <textarea
                  className="input input--area"
                  rows={2}
                  value={String(item[f.key] ?? '')}
                  placeholder={f.placeholder}
                  onChange={(e) => set(i, f.key, e.target.value)}
                />
              </label>
            ))}
            <button type="button" className="btn btn--ghost btn--danger-text" onClick={() => remove(i)}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="btn btn--ghost" onClick={() => onChange([...items, makeEmpty()])}>
          + {addLabel}
        </button>
      </div>
    </Field>
  );
}

/** Sticky save bar at the bottom of edit screens. */
export function SaveBar({
  onSave,
  onCancel,
  saving,
  label = 'Save',
}: {
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  label?: string;
}) {
  return (
    <div className="save-bar">
      <button type="button" className="btn btn--secondary" onClick={onCancel}>
        Cancel
      </button>
      <button type="button" className="btn btn--primary" onClick={onSave} disabled={saving}>
        {saving ? 'Saving…' : label}
      </button>
    </div>
  );
}
