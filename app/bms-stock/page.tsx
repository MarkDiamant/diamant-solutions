"use client";
import {BmsPage} from "@/business-software-core/components/admin/BmsUI";
import MaterialsHistory from "@/business-software-core/components/admin/materials/MaterialsHistory";
import "@/business-software-core/components/admin/materials/materials.css";
export default function StockPage(){return <BmsPage className="bms-materials"><header className="bms-materials-header"><div><h1>Stock</h1><p className="bms-materials-subtitle">Stock balances and recorded product movements.</p></div></header><MaterialsHistory/></BmsPage>}
