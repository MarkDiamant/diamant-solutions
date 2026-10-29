"use client";

// Dashboard layout and lost-status row colours are rendered by V3 itself.
// Avoid injecting global CSS or observing and rewriting the live DOM.
import CrmDashboardV4 from "./CrmDashboardV4";

export default function CrmDashboardV5() {
  return <CrmDashboardV4/>;
}
