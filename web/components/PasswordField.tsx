'use client';
import { useState } from 'react';

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  required?: boolean;
  hint?: string;
  /** Pass both to share one Show/Hide state between several fields (e.g. password + repeat password). */
  shown?: boolean;
  onToggle?: () => void;
};

/** Password box with a Show/Hide button, so people can check what they typed (helps motor, vision and memory needs). */
export function PasswordField({ id, label, value, onChange, autoComplete, required, hint, shown, onToggle }: Props) {
  const [own, setOwn] = useState(false);
  const visible = shown ?? own;
  const toggle = onToggle ?? (() => setOwn((v) => !v));
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="pw-wrap">
        <input id={id} type={visible ? 'text' : 'password'} autoComplete={autoComplete} autoCapitalize="none" autoCorrect="off" spellCheck={false} required={required} value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="pw-toggle" onClick={toggle} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? 'Hide' : 'Show'}</button>
      </div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
