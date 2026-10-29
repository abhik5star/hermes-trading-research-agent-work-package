import { AssistantMascot } from './AssistantMascot';
import { NotificationBell } from '../nav/NotificationBell';

/**
 * Bottom-right corner dock.
 *
 * Two compact controls only:
 *   • a small Miri avatar (click → text/voice assistant panel) and
 *   • the notification bell (click → the complete brain event stream).
 *
 * Both stay parked in the corner and never auto-open, so they can never
 * cover the chart or the panel you are reading.
 */
export function CornerDock() {
  return (
    <div className="fixed bottom-4 right-4 z-[80] flex items-end gap-2">
      <NotificationBell />
      <AssistantMascot />
    </div>
  );
}
