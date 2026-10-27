"use client";
import {useEffect,useState} from "react";
import {useSearchParams} from "next/navigation";
import Link from "next/link";
import {BmsPageTitle,BmsPage,BmsPageHeader,BmsCard,BmsButton,BmsState,BmsInput,BmsSelect,BmsField} from "./BmsUI";

const money=(n:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(n);
const sampleNames:Record<string,string>={flooring:"Oak & Stone Flooring",northstar:"Northstar Property & Projects",electrical:"BrightSpark Electrical",insurance:"Insurance",studio:"Creative Agency",consultancy:"Consultancy",distribution:"Atlas Distribution"};
const sampleProducts:Record<string,{name:string;unit:string;cost:number;price:number;stock:boolean}[]>={flooring:[{name:"Oak laminate 8mm",unit:"pack (2.2 m²)",cost:24,price:39,stock:true},{name:"Oak LVT click",unit:"pack (2.5 m²)",cost:32,price:49,stock:true},{name:"Porcelain grey tile",unit:"box",cost:18,price:31,stock:true},{name:"Foam underlay",unit:"roll",cost:12,price:21,stock:true}],northstar:[{name:"Boiler circulation pump",unit:"each",cost:95,price:145,stock:true}],electrical:[{name:"Consumer unit",unit:"each",cost:82,price:139,stock:true}],insurance:[{name:"Policy administration",unit:"service",cost:35,price:70,stock:false}],studio:[{name:"A4 brochure print",unit:"each",cost:1.8,price:4,stock:false}],consultancy:[{name:"Consultancy workshop",unit:"day",cost:480,price:800,stock:false}],distribution:[{name:"Pallet",unit:"each",cost:9.5,price:17,stock:true}]};
export default function DemoOperationsPanel(){
 const sample=useSearchParams().get("sample")||"flooring",flooring=sample==="flooring";
 const [message,setMessage]=useState("");
 const products=flooring&&connected?.products?.length?connected.products.map((p:any)=>({name:p.name,unit:p.unit,cost:Number(p.cost_net||0),price:Number(p.fixed_sell_net||0),stock:true})):sampleProducts[sample]||sampleProducts.flooring;
 const [connected,setConnected]=useState<any>(null),[connectedError,setConnectedError]=useState("");
 const [refreshKey,setRefreshKey]=useState(0);
 const [busy,setBusy]=useState(false),[customerName,setCustomerName]=useState(""),[area,setArea]=useState("48"),[waste,setWaste]=useState("10"),[selectedProduct,setSelectedProduct]=useState(""),[selectedCustomer,setSelectedCustomer]=useState(""),[selectedSupplier,setSelectedSupplier]=useState(""),[selectedJob,setSelectedJob]=useState(""),[quoteScope,setQuoteScope]=useState("Supply and fit flooring"),[quoteAmount,setQuoteAmount]=useState("888");
 const product=connected?.products?.find((p:any)=>p.id===selectedProduct)||connected?.products?.[0];
 const customerId=selectedCustomer||connected?.customers?.[0]?.id;
 const customerPrice=connected?.customer_prices?.find((p:any)=>p.product_id===product?.id&&p.customer_id===customerId);
 const unitPrice=Number(customerPrice?.sell_net??product?.fixed_sell_net??0);
 const coverage=Number(product?.specifications?.coverage_m2_per_pack||product?.units_per_pack||0);
 const packs=Number(area)>0&&Number(waste)>=0&&Number(waste)<=100&&coverage>0?Math.ceil(Number(area)*(1+Number(waste)/100)/coverage):0;
 const run=async(action:string,extra:Record<string,unknown>={})=>{if(busy)return;setBusy(true);setMessage("");try{const r=await fetch("/api/bms-demo/flooring-actions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,request_key:"flooring-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,12),...extra})});const data=await r.json();if(!r.ok)throw Error(data.error||"Demo action rejected");setMessage("Saved to isolated demo database: "+action.replaceAll("_"," "));setConnected(null);setRefreshKey(v=>v+1)}catch(e){setMessage("Action not saved: "+(e instanceof Error?e.message:"Unknown error"))}finally{setBusy(false)}};
 useEffect(()=>{if(!flooring)return;let active=true;fetch("/api/bms-demo/flooring-data",{cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("Database snapshot unavailable");return r.json()}).then(data=>{if(active){setConnected(data);setConnectedError("")}}).catch(()=>{if(active)setConnectedError("Connected flooring records could not be loaded. Authenticated demo operations are temporarily unavailable.")});return()=>{active=false}},[flooring,refreshKey]);
 return <BmsPage className="max-w-6xl">
  <BmsPageHeader className="bms-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><BmsPageTitle>{sampleNames[sample]||"Business"} operations demo</BmsPageTitle><p className="mt-1 text-sm text-slate-600">Fictional isolated BMS tenant. Connected operations require a manager login and persist to its database.</p></div><Link href="/" className="rounded-lg border px-3 py-2 text-sm font-semibold">Dashboard</Link></div></BmsPageHeader>
  {message&&<p role="status" className="rounded-lg bg-white p-3 text-sm">{message}</p>}
  <BmsCard className="p-5"><h2 className="text-lg font-bold">Central product catalogue</h2><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Product</th><th className="p-2">Unit</th><th className="p-2">Supplier cost</th><th className="p-2">Standard price</th><th className="p-2">Stock controlled</th></tr></thead><tbody>{products.map(p=><tr key={p.name} className="border-t"><td className="p-2">{p.name}</td><td className="p-2">{p.unit}</td><td className="p-2">{money(p.cost)}</td><td className="p-2">{money(p.price)}</td><td className="p-2">{p.stock?"Yes":"No"}</td></tr>)}</tbody></table></div></BmsCard>
  {flooring&&<>
  <BmsCard className="p-5"><h2 className="text-lg font-bold">Connected BMS flooring records</h2><p className="mt-1 text-sm text-slate-600">Live snapshot of a separate fictional tenant using shared product, purchasing, warehouse, sales, delivery, quotation and invoice tables. Manager-authorised actions below persist in that isolated tenant.</p>
  {connectedError&&<BmsState kind="error" className="mt-2">{connectedError}</BmsState>}
  <BmsButton variant="secondary" onClick={()=>{setConnected(null);setConnectedError("");setRefreshKey(v=>v+1)}}>Refresh connected records</BmsButton>
  {!connected&&!connectedError&&<BmsState kind="loading" className="mt-2">Loading connected records...</BmsState>}
  {connected&&<><div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><p><b>{connected.products?.length||0}</b> catalogue products</p><p><b>{connected.customers?.length||0}</b> customers</p><p><b>{connected.suppliers?.length||0}</b> suppliers</p><p><b>{connected.sales?.length||0}</b> sales orders</p><p><b>{connected.purchase?.length||0}</b> purchase orders</p><p><b>{connected.quotes?.length||0}</b> quotations</p><p><b>{connected.deliveries?.length||0}</b> deliveries</p><p><b>{connected.invoices?.length||0}</b> internal invoices</p></div><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs sm:text-sm"><thead><tr><th className="p-2">Live demo product</th><th className="p-2">Coverage</th><th className="p-2">On hand</th><th className="p-2">Reserved</th><th className="p-2">Standard price</th></tr></thead><tbody>{(connected.products||[]).map((p:any)=>{const b=(connected.stock||[]).find((x:any)=>x.product_id===p.id);return <tr key={p.id} className="border-t"><td className="p-2">{p.name}</td><td className="p-2">{Number(p.specifications?.coverage_m2_per_pack||p.units_per_pack||0)} m²/{p.unit}</td><td className="p-2">{Number(b?.on_hand||0)}</td><td className="p-2">{Number(b?.reserved||0)}</td><td className="p-2">{money(Number(p.fixed_sell_net||0))}</td></tr>})}</tbody></table></div><div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-bold text-slate-800">Connected website catalogue preview</h3><p className="mt-1 text-xs text-slate-600">Only products marked for website publication in this isolated BMS tenant. Prices and coverage are read directly from its central price book.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{(connected.products||[]).filter((p:any)=>p.show_on_website).map((p:any)=><article key={p.id} className="rounded-lg border border-slate-200 bg-white p-3"><p className="font-semibold">{p.name}</p><p className="mt-1 text-xs text-slate-500">{p.sku} · {Number(p.specifications?.coverage_m2_per_pack||p.units_per_pack||0)} m² per {p.unit}</p><p className="mt-2 font-bold">{money(Number(p.fixed_sell_net||0))} / {p.unit}</p></article>)}</div></div><p className="mt-3 text-xs text-slate-600">Customer-specific pricing and a draft invoice are stored in the demo tenant. No external accounting provider is connected.</p></>}
  </BmsCard>

  <BmsCard className="p-5">
   <h2 className="text-lg font-bold">Connected flooring workflow</h2>
   <p className="mt-1 text-sm text-slate-600">Actions below persist in the isolated fictional flooring tenant. Manager login required. No live tenant stock or accounting is affected.</p>
   <div className="mt-4 grid gap-3 sm:grid-cols-2">
    <BmsField>Product<BmsSelect value={selectedProduct||product?.id||""} onChange={e=>setSelectedProduct(e.target.value)}>{(connected?.products||[]).map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</BmsSelect></BmsField>
    <BmsField>Customer<BmsSelect value={selectedCustomer||connected?.customers?.[0]?.id||""} onChange={e=>setSelectedCustomer(e.target.value)}>{(connected?.customers||[]).map((p:any)=><option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}</BmsSelect></BmsField>
    <BmsField>Area (m²)<BmsInput type="number" min="0.1" step="0.1" value={area} onChange={e=>setArea(e.target.value)}/></BmsField>
    <BmsField>Wastage (%)<BmsInput type="number" min="0" max="100" value={waste} onChange={e=>setWaste(e.target.value)}/></BmsField>
    <BmsField>Supplier<BmsSelect value={selectedSupplier||connected?.suppliers?.[0]?.id||""} onChange={e=>setSelectedSupplier(e.target.value)}>{(connected?.suppliers||[]).map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</BmsSelect></BmsField>
    <BmsField>Job<BmsSelect value={selectedJob||connected?.jobs?.[0]?.id||""} onChange={e=>setSelectedJob(e.target.value)}>{(connected?.jobs||[]).map((p:any)=><option key={p.id} value={p.id}>{p.reference}</option>)}</BmsSelect></BmsField>
   </div>
   <p className="mt-3 font-semibold">{packs?packs+" "+(product?.unit||"packs")+" required at "+coverage+" m² per unit, "+money(unitPrice)+" per unit, "+money(packs*unitPrice)+" net":"Enter valid area, wastage and product coverage."}</p>
   {customerPrice&&<p className="text-xs text-slate-600">Customer-specific price applied from the shared BMS price book.</p>}
   <div className="mt-3 flex flex-wrap gap-2">
    <BmsButton disabled={busy||!packs||!connected} onClick={()=>run("create_sales_order",{customer_id:selectedCustomer||connected?.customers?.[0]?.id,job_id:selectedJob||connected?.jobs?.[0]?.id,product_id:product?.id,quantity:packs,area_m2:Number(area),wastage_percent:Number(waste)})}>Create sales order</BmsButton>
    <BmsButton disabled={busy||!packs||!connected} variant="secondary" onClick={()=>run("create_purchase_order",{supplier_id:selectedSupplier||connected?.suppliers?.[0]?.id,job_id:selectedJob||connected?.jobs?.[0]?.id,product_id:product?.id,quantity:packs,unit_cost_net:Number(product?.cost_net||0)})}>Create purchase order</BmsButton>
   </div>
   <div className="mt-5 grid gap-3 sm:grid-cols-2">
    <BmsField>New customer name<BmsInput placeholder="First and last name" value={customerName} onChange={e=>setCustomerName(e.target.value)}/></BmsField>
    <div className="flex flex-wrap items-end gap-2"><BmsButton disabled={busy||customerName.trim().split(/\s+/).length<2} onClick={()=>{const parts=customerName.trim().split(/\s+/);run("create_customer",{first_name:parts[0],last_name:parts.slice(1).join(" ")})}}>Create customer</BmsButton><BmsButton variant="secondary" disabled={busy||customerName.trim().split(/\s+/).length<2} onClick={()=>{const parts=customerName.trim().split(/\s+/);run("edit_customer",{customer_id:selectedCustomer||connected?.customers?.[0]?.id,first_name:parts[0],last_name:parts.slice(1).join(" ")})}}>Rename selected customer</BmsButton></div>
    <BmsField>Quote scope<BmsInput value={quoteScope} onChange={e=>setQuoteScope(e.target.value)}/></BmsField>
    <BmsField>Quote net amount (£)<BmsInput type="number" min="0.01" step="0.01" value={quoteAmount} onChange={e=>setQuoteAmount(e.target.value)}/></BmsField>
   </div>
   <div className="mt-3 flex flex-wrap gap-2">
    <BmsButton disabled={busy||!connected} onClick={()=>run("create_quote",{job_id:selectedJob||connected?.jobs?.[0]?.id,scope_text:quoteScope,amount:Number(quoteAmount)})}>Save quote revision</BmsButton>
    <BmsButton disabled={busy||!connected} variant="secondary" onClick={()=>run("create_draft_invoice",{job_id:selectedJob||connected?.jobs?.[0]?.id,total:Number(quoteAmount)*1.2})}>Create internal draft invoice</BmsButton>
   </div>
  </BmsCard>
  <BmsCard className="p-5"><h2 className="text-lg font-bold">Connected warehouse and delivery</h2>
   <p className="mt-1 text-sm text-slate-600">Operations use existing tenant-aware, idempotent database functions. Each button submits a new confirmed operation.</p>
   <div className="mt-3 flex flex-wrap gap-2">
    <BmsButton disabled={busy||!connected?.purchase_lines?.length} onClick={()=>run("receive",{line_id:connected.purchase_lines[0].id,location_id:connected.locations?.[0]?.id,quantity:Math.max(0,Number(connected.purchase_lines[0].ordered_quantity)-Number(connected.purchase_lines[0].received_quantity))})}>Receive outstanding goods</BmsButton>
    <BmsButton disabled={busy||!connected?.sales_lines?.length} variant="secondary" onClick={()=>run("reserve",{line_id:connected.sales_lines[0].id,location_id:connected.locations?.[0]?.id,quantity:Math.max(0,Number(connected.sales_lines[0].quantity)-Number(connected.sales_lines[0].reserved_quantity))})}>Reserve outstanding stock</BmsButton>
    <BmsButton disabled={busy||!connected?.sales_lines?.length} variant="secondary" onClick={()=>run("pick",{line_id:connected.sales_lines[0].id,location_id:connected.locations?.[0]?.id,quantity:Number(connected.sales_lines[0].reserved_quantity)})}>Pick reserved stock</BmsButton>
    <BmsButton disabled={busy||!connected?.deliveries?.length} variant="secondary" onClick={()=>run("deliver",{delivery_id:connected.deliveries[0].id})}>Confirm delivery</BmsButton>
    <BmsButton disabled={busy||!connected} variant="secondary" onClick={()=>run("return",{product_id:product?.id,location_id:connected.locations?.[0]?.id,quantity:1})}>Accept 1 unused pack</BmsButton>
   </div>
  </BmsCard>
  </>}
 </BmsPage>;
}
