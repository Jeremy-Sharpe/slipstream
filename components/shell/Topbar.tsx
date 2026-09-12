import { AddCallDialog } from "./AddCallDialog";
import { NotificationsMenu } from "./NotificationsMenu";
import { UserMenu } from "./UserMenu";

// Shared across every surface, actions right-aligned.
export function Topbar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-end gap-3 border-b border-border bg-card px-6">
      <AddCallDialog />
      <span className="mx-1 h-6 w-px bg-border" aria-hidden />
      <NotificationsMenu />
      <UserMenu />
    </header>
  );
}
