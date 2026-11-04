import DemoGate from "@/business-software-core/components/admin/DemoShowcase";
import StockPage from "@/app/bms-stock/page";
export const dynamic="force-dynamic";
export default function Page(){return <DemoGate section="stock"><StockPage/></DemoGate>}
