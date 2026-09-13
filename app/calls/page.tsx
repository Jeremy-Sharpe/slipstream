import { permanentRedirect } from "next/navigation";

/* The list moved to /conversations; the run routes under /calls/[id] stay. */
export default function CallsPage() {
  permanentRedirect("/conversations");
}
