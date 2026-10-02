export function Switch({ checked, onChange, label, hint, variant }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; variant?: 'oos';
}) {
  return (
    <label className="switch-row">
      <span className="label">
        {label}
        {hint && <div className="hint">{hint}</div>}
      </span>
      <span className={`switch ${variant ?? ''}`}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span />
      </span>
    </label>
  );
}
