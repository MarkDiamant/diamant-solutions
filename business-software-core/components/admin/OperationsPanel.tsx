"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";

type Product={id:string;name:string;sku?:string;unit?:string;category?:string;active:boolean;fixed_sell_net?:number;cost_net?:number};
type Customer={id:string;first_name?:string;last_name?:string};
type Location={id:string;name:string};
type PurchaseLine={id:string;material_order_id:string;product_id?:string;description:string;ordered_quantity:number;received_quantity:number;unit:string;unit_cost_net:number};
type Stock={product_id:string;location_id:string;on_hand:number;reserved:number;available:number};
type SalesOrder={id:string;reference?:string;customer_id:string;job_id?:string;status:string;created_at:string};
type Catalog={products:Product[];customers:Customer[];locations:Location[];purchase_lines:PurchaseLine[];suppliers:{id:string;name:string}[];permissions:{manage_stock:boolean;manage_pricing:boolean;create_sales:boolean}};
const initial:Catalog={products:[],customers:[],locations:[],purchase_lines:[],suppliers:[],permissions:{manage_stock:false,manage_pricing:false,create_sales:false}};
const inputClass="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900";
const labelClass="block text-xs font-semibold text-slate-700 mb-1";
async function api(path:string,options?:RequestInit){const response=await fetch("/api/admin/operations/"+path,{cache:"no-store",...options});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Unable to complete request");return data;}
function post(path:string,data:unknown){return api(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});}
export default function OperationsPanel(){
 const [catalog,setCatalog]=useState<Catalog>(initial),[stock,setStock]=useState<Stock[]>([]),[orders,setOrders]=useState<SalesOrder[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const [customer,setCustomer]=useState(""),[product,setProduct]=useState(""),[qty,setQty]=useState("1"),[reference,setReference]=useState("");
 const [priceCustomer,setPriceCustomer]=useState(""),[priceProduct,setPriceProduct]=useState(""),[price,setPrice]=useState("");
 const [receiptLine,setReceiptLine]=useState(""),[receiptQty,setReceiptQty]=useState("1"),[receiptLocation,setReceiptLocation]=useState(""),[locationName,setLocationName]=useState("");
 const [supplierName,setSupplierName]=useState(""),[poSupplier,setPoSupplier]=useState(""),[poProduct,setPoProduct]=useState(""),[poQty,setPoQty]=useState("1"),[poCost,setPoCost]=useState(""),[poNotes,setPoNotes]=useState("");
 const refresh=useCallback(async()=>{const [c,s,o]=await Promise.all([api("catalog"),api("stock"),api("sales-orders")]);setCatalog(c);setStock(s.balances||[]);setOrders(o.orders||[]);setLoading(false);},[]);
 useEffect(()=>{void refresh().catch(e=>{setNotice(e.message);setLoading(false);});const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh().catch(()=>{});},30000);return()=>window.clearInterval(timer);},[refresh]);
 const productById=useMemo(()=>new Map(catalog.products.map(p=>[p.id,p])),[catalog.products]);
 const customerById=useMemo(()=>new Map(catalog.customers.map(c=>[c.id,[c.first_name,c.last_name].filter(Boolean).join(" ")])),[catalog.customers]);
 const chosenLine=catalog.purchase_lines.find(l=>l.id===receiptLine);
 async function submit(task:()=>Promise<unknown>,success:string){if(busy)return;setBusy(true);setNotice("");try{await task();await refresh();setNotice(success);}catch(e){setNotice(e instanceof Error?e.message:"Unable to save");}finally{setBusy(false);}}
 return <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 text-slate-900">
  <header className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Sales and stock operations</h1><p className="mt-1 text-sm text-slate-600">Shared BMS catalogue, customer pricing, sales orders and goods receipts.</p></div><Link href="/" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Dashboard</Link></div></header>
  {notice&&<p role="status" className="rounded-lg bg-white p-3 text-sm">{notice}</p>}
  {loading?<p className="rounded-xl bg-white p-6">Loading operations...</p>:<>
  <div className="grid gap-4 lg:grid-cols-2">
   {catalog.permissions.create_sales&&<section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Create sales order</h2><p className="mb-4 text-sm text-slate-500">Agreed unit prices are calculated and saved by the server.</p>
    <form className="space-y-3" onSubmit={e=>{e.preventDefault();void submit(()=>post("sales-orders",{customer_id:customer,reference:reference||null,lines:[{product_id:product,quantity:Number(qty)}]}),"Sales order created.");}}>
     <label className={labelClass}>Customer<select required className={inputClass} value={customer} onChange={e=>setCustomer(e.target.value)}><option value="">Choose customer</option>{catalog.customers.map(c=><option key={c.id} value={c.id}>{customerById.get(c.id)}</option>)}</select></label>
     <label className={labelClass}>Product<select required className={inputClass} value={product} onChange={e=>setProduct(e.target.value)}><option value="">Choose product</option>{catalog.products.filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{p.name}{p.sku?" ("+p.sku+")":""}</option>)}</select></label>
     <div className="grid grid-cols-2 gap-3"><label className={labelClass}>Quantity<input className={inputClass} type="number" step="0.001" min="0.001" required value={qty} onChange={e=>setQty(e.target.value)}/></label><label className={labelClass}>Reference (optional)<input className={inputClass} value={reference} onChange={e=>setReference(e.target.value)}/></label></div>
     <button disabled={busy||!customer||!product} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Create draft order</button>
    </form>
   </section>}
   {catalog.permissions.manage_pricing&&<section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Customer-specific price</h2><p className="mb-4 text-sm text-slate-500">Only the selected product is overridden. Existing orders retain their agreed prices.</p>
    <form className="space-y-3" onSubmit={e=>{e.preventDefault();void submit(()=>post("customer-price",{customer_id:priceCustomer,product_id:priceProduct,sell_net:Number(price)}),"Customer price saved.");}}>
     <label className={labelClass}>Customer<select required className={inputClass} value={priceCustomer} onChange={e=>setPriceCustomer(e.target.value)}><option value="">Choose customer</option>{catalog.customers.map(c=><option key={c.id} value={c.id}>{customerById.get(c.id)}</option>)}</select></label>
     <label className={labelClass}>Product<select required className={inputClass} value={priceProduct} onChange={e=>setPriceProduct(e.target.value)}><option value="">Choose product</option>{catalog.products.filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
     <label className={labelClass}>Agreed selling price, net GBP<input required className={inputClass} type="number" min="0" step="0.0001" value={price} onChange={e=>setPrice(e.target.value)}/></label>
     <button disabled={busy||!priceCustomer||!priceProduct||price===""} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Save price override</button>
    </form>
   </section>}
   {catalog.permissions.manage_stock&&<section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Draft purchase order</h2><p className="mb-4 text-sm text-slate-500">Creates an internal supplier order only. Nothing is sent to the supplier.</p>
    <form className="space-y-3" onSubmit={e=>{e.preventDefault();void submit(()=>post("purchase-order",{supplier_id:poSupplier,notes:poNotes,lines:[{product_id:poProduct,quantity:Number(poQty),unit_cost_net:Number(poCost)}]}),"Draft purchase order created.");}}>
     <div className="flex gap-2"><input aria-label="New supplier" className={inputClass} placeholder="New supplier name" value={supplierName} onChange={e=>setSupplierName(e.target.value)}/><button type="button" disabled={busy||supplierName.trim().length<2} onClick={()=>void submit(()=>post("supplier",{name:supplierName}),"Supplier added.")} className="whitespace-nowrap rounded-lg border px-3 text-sm font-bold">Add supplier</button></div>
     <label className={labelClass}>Supplier<select required className={inputClass} value={poSupplier} onChange={e=>setPoSupplier(e.target.value)}><option value="">Choose supplier</option>{catalog.suppliers.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
     <label className={labelClass}>Product<select required className={inputClass} value={poProduct} onChange={e=>setPoProduct(e.target.value)}><option value="">Choose product</option>{catalog.products.filter(x=>x.active).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
     <div className="grid grid-cols-2 gap-3"><label className={labelClass}>Quantity<input required className={inputClass} type="number" min="0.001" step="0.001" value={poQty} onChange={e=>setPoQty(e.target.value)}/></label><label className={labelClass}>Unit purchase cost, net GBP<input required className={inputClass} type="number" min="0" step="0.0001" value={poCost} onChange={e=>setPoCost(e.target.value)}/></label></div>
     <label className={labelClass}>Notes<input className={inputClass} value={poNotes} onChange={e=>setPoNotes(e.target.value)}/></label>
     <button disabled={busy||!poSupplier||!poProduct||poCost===""} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Create draft purchase order</button>
    </form>
   </section>}
   {catalog.permissions.manage_stock&&<section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Receive ordered materials</h2><p className="mb-4 text-sm text-slate-500">Confirmed receipts update stock once, with an auditable movement record.</p>
    <form className="space-y-3" onSubmit={e=>{e.preventDefault();const key=receiptLine+":"+receiptLocation+":"+crypto.randomUUID();void submit(()=>post("receive-purchase",{line_id:receiptLine,location_id:receiptLocation,quantity:Number(receiptQty),receipt_key:key}),"Goods receipt recorded.");}}>
     <label className={labelClass}>Outstanding purchase line<select required className={inputClass} value={receiptLine} onChange={e=>setReceiptLine(e.target.value)}><option value="">Choose purchase line</option>{catalog.purchase_lines.filter(l=>Number(l.ordered_quantity)>Number(l.received_quantity)&&l.product_id).map(l=><option key={l.id} value={l.id}>{l.description} ({Number(l.ordered_quantity)-Number(l.received_quantity)} remaining)</option>)}</select></label>
     <label className={labelClass}>Stock location<select required className={inputClass} value={receiptLocation} onChange={e=>setReceiptLocation(e.target.value)}><option value="">Choose location</option>{catalog.locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
     <label className={labelClass}>Quantity received<input required className={inputClass} type="number" min="0.001" max={chosenLine?Number(chosenLine.ordered_quantity)-Number(chosenLine.received_quantity):undefined} step="0.001" value={receiptQty} onChange={e=>setReceiptQty(e.target.value)}/></label>
     <button disabled={busy||!receiptLine||!receiptLocation} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Confirm goods received</button>
    </form>
    <form className="mt-5 flex gap-2" onSubmit={e=>{e.preventDefault();void submit(()=>post("location",{name:locationName}),"Location saved.");setLocationName("");}}><input aria-label="New stock location" className={inputClass} placeholder="New stock location" value={locationName} onChange={e=>setLocationName(e.target.value)}/><button disabled={busy||locationName.trim().length<2} className="whitespace-nowrap rounded-lg border px-3 text-sm font-bold">Add location</button></form>
   </section>}
   <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Stock balances</h2><div className="mt-3 max-h-80 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Product</th><th className="p-2 text-right">On hand</th><th className="p-2 text-right">Reserved</th><th className="p-2 text-right">Available</th></tr></thead><tbody>{stock.map(s=><tr key={s.product_id+":"+s.location_id} className="border-t"><td className="p-2">{productById.get(s.product_id)?.name||s.product_id}<span className="block text-xs text-slate-500">{catalog.locations.find(l=>l.id===s.location_id)?.name}</span></td><td className="p-2 text-right">{s.on_hand}</td><td className="p-2 text-right">{s.reserved}</td><td className="p-2 text-right">{s.available}</td></tr>)}</tbody></table>{!stock.length&&<p className="p-3 text-sm text-slate-500">No stock movements recorded yet.</p>}</div></section>
  </div>
  <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Sales orders</h2><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Reference</th><th className="p-2">Customer</th><th className="p-2">Status</th><th className="p-2">Created</th></tr></thead><tbody>{orders.map(o=><tr key={o.id} className="border-t"><td className="p-2">{o.reference||o.id.slice(0,8)}</td><td className="p-2">{customerById.get(o.customer_id)||o.customer_id}</td><td className="p-2">{o.status}</td><td className="p-2">{new Date(o.created_at).toLocaleDateString("en-GB")}</td></tr>)}</tbody></table>{!orders.length&&<p className="p-3 text-sm text-slate-500">No sales orders yet.</p>}</div></section>
  </>}
 </main>;
}
