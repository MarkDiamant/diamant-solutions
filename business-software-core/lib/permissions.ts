export type PermissionKey =
  | "view_jobs" | "edit_jobs" | "view_completed_jobs" | "view_history"
  | "view_customer_details" | "view_pricing" | "view_costs_profit"
  | "view_money_overview" | "view_payments_invoices" | "view_files"
  | "view_stock" | "manage_stock" | "manage_purchasing" | "view_sales_orders" | "edit_sales_orders" | "manage_deliveries" | "manage_fitting"
  | "view_workforce" | "manage_workforce" | "manage_users" | "manage_business_settings" | "manage_subscription" | "view_own_work";

export type UserRole = "owner" | "admin" | "manager" | "office" | "sales" | "field" | "worker" | "custom";

export const PERMISSION_LABELS: Record<PermissionKey,string> = {
 view_jobs:"Jobs: view job details (not financial data)", edit_jobs:"Jobs: edit job details and progress", view_completed_jobs:"Jobs: view completed and closed jobs",
 view_history:"Jobs: view activity and history", view_customer_details:"Customers: view contact information",
 view_pricing:"Quotes: view prices and customer quotations", view_costs_profit:"Finance: job costs, margins and profit tab",
 view_money_overview:"Finance: Money Overview and financial dashboard", view_payments_invoices:"Finance: payments, invoices and job invoice tab",
 view_files:"Files: job photos, documents and File Library",
 view_stock:"Stock: view inventory and availability",manage_stock:"Stock: receive, reserve, pick, return and adjust",manage_purchasing:"Purchasing: supplier purchase orders and goods received",view_sales_orders:"Sales: view customer orders",edit_sales_orders:"Sales: create and edit customer orders",manage_deliveries:"Deliveries: plan and update delivery schedules",manage_fitting:"Scheduling: manage fitting jobs", view_workforce:"Workforce: view team, contractors and schedules", manage_workforce:"Workforce: manage team, contractors and planning",
 manage_users:"Administration: invite users and manage permissions", manage_business_settings:"Administration: business settings and integrations",
 manage_subscription:"Administration: subscription and billing", view_own_work:"My Work: own assignments, timesheets and schedule",
};

export const ALL_PERMISSIONS=Object.keys(PERMISSION_LABELS) as PermissionKey[];
const all=ALL_PERMISSIONS;
export const ROLE_PERMISSIONS: Record<UserRole,PermissionKey[]> = {
 owner: all,
 admin: all,
 manager: all.filter(x=>!["manage_users","manage_business_settings","manage_subscription"].includes(x)),
 office: ["view_sales_orders","view_stock","view_jobs","edit_jobs","view_completed_jobs","view_history","view_customer_details","view_pricing","view_money_overview","view_payments_invoices","view_files","view_workforce"],
 sales: ["view_sales_orders","edit_sales_orders","view_stock","view_jobs","edit_jobs","view_completed_jobs","view_history","view_customer_details","view_pricing","view_files"],
 field: ["view_stock","view_jobs","edit_jobs","view_customer_details","view_files","view_workforce"],
 worker: ["view_own_work"],
 custom: [],
};
export const ROLE_LABELS:Record<UserRole,string>={owner:"Owner",admin:"Admin",manager:"Manager",office:"Office",sales:"Sales",field:"Field / engineer",worker:"Worker (own schedule only)",custom:"Custom"};

