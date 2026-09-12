"use client";

import { Bell } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const TRIGGER = "flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground active:bg-border/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none";

export function NotificationsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button type="button" aria-label="Notifications" className={TRIGGER} />}>
        <Bell className="size-5" strokeWidth={1.5} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuItem disabled className="text-muted-foreground">You're all caught up.</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
