import DemoGate from "@/business-software-core/components/admin/DemoShowcase";
import SalesOrders from "@/app/bms-sales-orders/page";
export const dynamic="force-dynamic";
export default function Page(){return <DemoGate section="operations"><SalesOrders/></DemoGate>;}
