// Keep reviewed document gates aligned with the shared BMS effective policy.
// A nonempty saved permission list overrides role defaults, including managers.
const defaults=["view_jobs","edit_jobs","view_customer_details","view_pricing","view_payments_invoices","view_costs_profit","view_workforce","manage_workforce","view_files","view_history","view_money_overview","manage_business_settings","manage_users","view_stock","manage_stock","manage_purchasing","view_sales_orders","edit_sales_orders","manage_deliveries","manage_fitting"];
const operational=["view_stock","manage_stock","manage_purchasing","view_sales_orders","edit_sales_orders","manage_deliveries","manage_fitting"];
export function effectiveBmsPermission(member:any,permission:string){
 const allowed=Array.isArray(member?.permissions)&&member.permissions.length?member.permissions:(["admin","manager","owner"].includes(member?.role)?defaults:["view_jobs","view_customer_details","view_files"]);
 return allowed.includes(permission)||(["owner","admin"].includes(String(member?.role))&&operational.includes(permission));
}
