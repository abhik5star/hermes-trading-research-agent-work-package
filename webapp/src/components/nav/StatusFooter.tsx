import { useStore } from '../../state/store';

export function StatusFooter() {
  const snapshot = useStore((s) => s.snapshot);
  if (!snapshot) return null;

  return (
    <footer className="relative z-20 px-4 lg:px-6 pb-3">
      <div className="glass rounded-2xl px-4 py-2 flex items-center gap-5 flex-wrap text-[0.64rem] dim">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-green breathe" />
          {snapshot.dataAdapter}
        </span>
        <span>heartbeat <b className="font-mono text-white/70">#{snapshot.heartbeat}</b></span>
        <span>parallel sandbox <b className="font-mono text-white/70">{snapshot.sandbox.total}</b> instruments · <b className="font-mono text-neon-violet">{snapshot.sandbox.open}</b> open paper positions</span>
        <span>mode <b className="text-white/70 uppercase">{snapshot.mode.replace('-', ' ')}</b></span>
        <span className="ml-auto opacity-70">Simulated research environment — no live broker routing · human decision gates required for real capital</span>
      </div>
    </footer>
  );
}
