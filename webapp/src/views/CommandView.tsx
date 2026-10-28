import { useStore } from '../state/store';
import { GlanceCards, EquityStrip } from '../components/panels/GlanceCards';
import { NeuralChart } from '../components/chart/NeuralChart';
import { NeuralStateWidget } from '../components/panels/NeuralStateWidget';
import { RiskHud } from '../components/panels/RiskHud';
import { PositionsList } from '../components/panels/PositionsList';
import { MascotDock } from '../components/mascot/MascotDock';
import { Chip } from '../components/ui/Primitives';
import { instrument } from '../engine/instruments';
import { MorphNumber } from '../components/ui/Primitives';

export function CommandView() {
  const snapshot = useStore((s) => s.snapshot);
  if (!snapshot) return null;
  const inst = instrument(snapshot.focusSymbol);

  return (
    <div className="space-y-4">
      <GlanceCards />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-8 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold heading-accent">{inst.display}</h2>
              <Chip tone={inst.exchange === 'NSE' ? 'amber' : 'violet'}>
                {inst.exchange} · {inst.vehicle.toUpperCase()}
              </Chip>
              <Chip tone={snapshot.bias === 'bullish' ? 'green' : 'red'}>
                structure {snapshot.bias}
              </Chip>
            </div>
            <div className="flex items-center gap-3">
              <span className="hud-label">Live mark</span>
              <MorphNumber value={snapshot.price} format={(n) => n.toFixed(2)} className="text-2xl font-semibold" />
            </div>
          </div>

          <NeuralChart />
          <EquityStrip />

          <div className="glass rounded-3xl p-4">
            <p className="hud-label mb-2">Silent indicator confluence — processed in backend, never drawn raw</p>
            <div className="flex flex-wrap gap-2">
              {snapshot.hiddenConfirmations.map((c) => (
                <Chip key={c} tone="cyan">{c}</Chip>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-4">
          <NeuralStateWidget />
          <RiskHud />
          <PositionsList />
          <MascotDock />
        </div>
      </div>
    </div>
  );
}
