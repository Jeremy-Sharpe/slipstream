import { StartCoachDialog } from "@/components/coach/StartCoachDialog";
import { AddCallDialog } from "./AddCallDialog";
import { NotificationsMenu } from "./NotificationsMenu";
import { UserMenu } from "./UserMenu";

// Shared across every surface, actions right-aligned like Clay's top bar:
// primary actions, a wide gap, icon buttons on a 44px pitch, then the avatar.
export function Topbar() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-end gap-2 border-b border-border bg-card pr-4">
      <StartCoachDialog />
      <AddCallDialog />
      <div className="ml-10 flex items-center gap-3">
        <NotificationsMenu />
        <span className="w-1" aria-hidden />
        <UserMenu />
      </div>
    </header>
  );
}
