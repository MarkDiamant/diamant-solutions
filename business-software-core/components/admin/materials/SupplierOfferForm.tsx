"use client";
import {useState} from "react";
import {BmsInput} from "../BmsUI";
export default function SupplierOfferForm({productId,onSaved}:{productId:string;onSaved:()=>void}){
 const [open,setOpen]=useState(false),[supplier,setSupplier]=useState(""),[sku,setSku]=useState(""),[link,setLink]=useState(""),[cost,setCost]=useState(""),[vat,setVat]=useState("20"),[message,setMessage]=useState("");
 const save=async()=>{const r=await fetch("/api/bms-materials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"supplier",product_id:productId,supplier,sku,link,cost_net:cost===""?null:Number(cost),vat_rate:Number(vat)})});const v=await r.json();if(!r.ok){setMessage(v.error||"Could not save supplier");return}setOpen(false);setMessage("Supplier offer saved");onSaved()};
 return <div style={{marginTop:8}}><button type="button" onClick={()=>setOpen(v=>!v)}>{open?"Cancel supplier":"Add supplier option"}</button>{open&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,padding:8}}>{([["Supplier",supplier,setSupplier],["Supplier SKU",sku,setSku],["HTTPS product link",link,setLink],["Unit cost ex VAT",cost,setCost],["VAT %",vat,setVat]] as const).map(([label,value,set])=><label key={label}>{label}<BmsInput value={value} onChange={e=>set(e.target.value)} style={{display:"block",width:"100%",boxSizing:"border-box",padding:8}}/></label>)}<button onClick={save}>Save supplier</button></div>}{message&&<p role="status">{message}</p>}</div>;
}
