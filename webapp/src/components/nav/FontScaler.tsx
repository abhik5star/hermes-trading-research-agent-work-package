import { useStore, type FontScale } from '../../state/store';
import { cn } from '../../utils/cn';

const SIZES: { key: FontScale; label: string; cls: string }[] = [
  { key: 'sm', label: 'A−', cls: 'text-[0.72rem]' },
  { key: 'md', label: 'A', cls: 'text-[0.9rem]' },
  { key: 'lg', label: 'A+', cls: 'text-[1.08rem]' },
];

export function FontScaler() {
  const fontScale = useStore((s) => s.fontScale);
  const setFontScale = useStore((s) => s.setFontScale);
  return (
    <div className="glass rounded-2xl p-1 flex items-center" title="Dynamic font scaler — layout stays responsive">
      {SIZES.map((s) => (
        <button
          key={s.key}
          onClick={() => setFontScale(s.key)}
          className={cn(
            'w-9 h-8 rounded-xl grid place-items-center font-semibold transition-all duration-300',
            s.cls,
            fontScale === s.key
              ? 'bg-[var(--accent-soft)] text-white shadow-glow border border-[var(--accent)]/40'
              : 'dim hover:text-white',
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
