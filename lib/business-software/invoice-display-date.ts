export function invoiceDisplayDate(invoiceDate: unknown, createdAt: unknown): string {
  const civil = typeof invoiceDate === "string" ? invoiceDate.trim() : "";
  if (civil) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(civil)) return "not recorded";
    const parsed = new Date(civil + "T00:00:00Z");
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== civil) return "not recorded";
    const [year, month, day] = civil.split("-");
    return `${day}/${month}/${year}`;
  }
  if (typeof createdAt !== "string" || !createdAt.trim()) return "not recorded";
  const timestamp = new Date(createdAt);
  return Number.isFinite(timestamp.getTime()) ? timestamp.toLocaleDateString("en-GB") : "not recorded";
}
