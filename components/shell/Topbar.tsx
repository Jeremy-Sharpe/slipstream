import { Bell, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

// Shared across every surface. Right-aligned like Clay's top bar.
export function Topbar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-end gap-3 border-b border-border px-6">
      <Button className="h-8 rounded-md px-3 text-sm font-medium">
        <Plus className="size-4" strokeWidth={2.25} /> Add a call
      </Button>
      <span className="mx-1 h-6 w-px bg-border" aria-hidden />
      <Button size="icon" variant="ghost" className="size-8 rounded-md" aria-label="Notifications">
        <Bell className="size-[18px]" strokeWidth={1.75} />
      </Button>
      <Avatar className="size-7"><AvatarFallback className="bg-foreground text-[11px] text-background">MD</AvatarFallback></Avatar>
    </header>
  );
}
