import { AssistantMascot } from './AssistantMascot';

/**
 * Bottom-right corner dock.
 *
 * One compact control only: a small Miri avatar (click → text/voice assistant
 * panel with the live backend briefing). It stays parked in the corner and
 * never auto-opens, so it can never cover the chart or the panel you are
 * reading. The notification bell lives in the top-right of the ticker bar.
 */
export function CornerDock() {
  return (
    <div className="fixed bottom-4 right-4 z-[80] flex items-end gap-2">
      <AssistantMascot />
    </div>
  );
}
