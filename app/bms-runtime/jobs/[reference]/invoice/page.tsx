import XeroInvoicePage from "@/components/admin/XeroInvoicePage";
export default async function InvoicePage({params}:{params:Promise<{reference:string}>}){const {reference}=await params;return <XeroInvoicePage reference={reference.toUpperCase()}/>;}
