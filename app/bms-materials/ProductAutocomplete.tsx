"use client";
import {useMemo,useState} from "react";
export default function ProductAutocomplete({products,onSelect}:{products:any[];onSelect:(product:any)=>void}){
 const [q,setQ]=useState(""),[open,setOpen]=useState(false);
 const matches=useMemo(()=>{const words=q.toLowerCase().trim().split(/\s+/).filter(Boolean);if(!words.length)return [];return products.filter(p=>{const hay=[p.name,p.sku,p.description,p.unit].join(" ").toLowerCase();return words.every(w=>hay.includes(w))}).slice(0,12)},[products,q]);
 return <div style={{position:"relative",marginTop:8}}><label style={{fontSize:12}}>Choose from Price Book <input value={q} onChange={e=>{setQ(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)} placeholder="Type product name, size or SKU" style={{display:"block",padding:9,width:"100%",boxSizing:"border-box"}}/></label>{open&&q&&<div style={{position:"absolute",zIndex:10,background:"white",color:"#111",border:"1px solid #ddd",width:"100%",maxHeight:200,overflow:"auto"}}>{matches.map(p=><button type="button" key={p.id} onClick={()=>{onSelect(p);setQ("");setOpen(false)}} style={{display:"block",padding:10,width:"100%",textAlign:"left",borderBottom:"1px solid #eee"}}>{p.name} {p.sku?"· "+p.sku:""} {p.description?"· "+p.description:""}</button>)}{matches.length===0&&<p style={{padding:10}}>No matching products. Enter a new product below.</p>}</div>}</div>;
}
