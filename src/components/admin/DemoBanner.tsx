import { Notice } from "@/components/admin/ui";

/** Visible only while demo mode is active in the admin area. */
export function DemoBanner() {
  return (
    <Notice tone="warning">
      <strong>Demo data</strong> — these figures, enquiries and projects are
      sample placeholders for screenshots and practice. They are not real leads
      or revenue. Turn off with the Demo button at the bottom-right.
    </Notice>
  );
}
