import InvoicePrint from "@/components/admin/InvoicePrint";
export default async function InvoicePage({params}:{params:Promise<{reference:string;invoiceId:string}>}){const{reference,invoiceId}=await params;return <InvoicePrint reference={reference.toUpperCase()} invoiceId={invoiceId}/>;}
