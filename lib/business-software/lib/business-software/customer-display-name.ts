export function customerDisplayName(customer: {first_name?: unknown; last_name?: unknown} | null | undefined): string {
  return [customer?.first_name, customer?.last_name].map(value => typeof value === "string" ? value.trim() : "").filter(Boolean).join(" ") || "Customer";
}
