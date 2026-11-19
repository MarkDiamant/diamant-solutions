"use client";
import {BmsTable} from "./BmsUI";
import {useState} from "react";
type Row={name:string;sku:string;category:string;unit:string;purchase_unit:string;cost_net:string|null;sell_net:string|null;cost_vat_rate:string|null;price_basis:string;stock_controlled:boolean|null;description:string;coverage_m2_per_pack:string|null;supplier_id:string;source_file:string;source_row:number};
function parseCsv(input:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],value="",quoted=false;
 for(let i=0;i<input.length;i++){const c=input[i];if(c==='"'){if(quoted&&input[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===","&&!quoted){row.push(value.trim());value="";}else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&input[i+1]==="\n")i++;row.push(value.trim());if(row.some(x=>x!==""))rows.push(row);row=[];value="";}else value+=c;}
 if(quoted)throw new Error("CSV has an unclosed quoted field");row.push(value.trim());if(row.some(x=>x!==""))rows.push(row);return rows;
}
function normalise(x:string){return x.toLowerCase().replace(/[^a-z0-9]/g,"");}
const columns:Record<string,string[]>={name:["name","productname","itemname"],sku:["sku","productsku","itemcode"],category:["category","productcategory"],unit:["unit","sellingunit"],purchase_unit:["purchaseunit","costunit"],cost_net:["costnet","cost","purchasecost"],sell_net:["sellnet","sellingprice","price","saleprice"],cost_vat_rate:["costvatrate","purchasevatrate"],price_basis:["pricebasis"],stock_controlled:["stockcontrolled","stockcontrol"],description:["description","productdescription"],coverage_m2_per_pack:["coveragem2perpack","packcoveragem2"],supplier_id:["supplierid"]};
function convert(lines:string[][],filename:string):Row[]{
 if(lines.length<2)throw new Error("CSV needs a header and at least one product");
 const headings=lines[0].map(normalise),mapped=headings.map(h=>Object.keys(columns).find(k=>columns[k].includes(h)));
 const unknown=lines[0].filter((_,i)=>!mapped[i]);if(unknown.length)throw new Error("Unmapped headings: "+unknown.join(", ")+". No columns have been discarded. Review a copy of the source before uploading.");
 if(new Set(mapped).size!==mapped.length)throw new Error("Two headings map to the same field. Review them rather than silently selecting one.");
 const field=(row:string[],name:string)=>{const index=mapped.indexOf(name);return index>=0?row[index]||"":"";};
 return lines.slice(1).map((row,index)=>{
  if(row.length>headings.length)throw new Error("Row "+(index+2)+" contains values beyond the headings; nothing has been discarded.");
  const flag=field(row,"stock_controlled").toLowerCase();const stock=["true","yes","1"].includes(flag)?true:["false","no","0"].includes(flag)?false:null;
  return {name:field(row,"name"),sku:field(row,"sku"),category:field(row,"category"),unit:field(row,"unit"),purchase_unit:field(row,"purchase_unit"),cost_net:field(row,"cost_net")||null,sell_net:field(row,"sell_net")||null,cost_vat_rate:field(row,"cost_vat_rate")||null,price_basis:field(row,"price_basis").toLowerCase(),stock_controlled:stock,description:field(row,"description"),coverage_m2_per_pack:field(row,"coverage_m2_per_pack")||null,supplier_id:field(row,"supplier_id"),source_file:filename,source_row:index+2};
 });
}
export default function ProductCsvImport({onImported}:{onImported:()=>Promise<void>}){
 const [rows,setRows]=useState<Row[]>([]),[preview,setPreview]=useState<any>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function submit(confirm:boolean){if(busy||!rows.length)return;setBusy(true);setError("");try{const response=await fetch("/api/admin/operations/import-products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rows,confirm})});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||"Import failed");setPreview(result);if(confirm){setRows([]);await onImported();}}catch(e){setError(e instanceof Error?e.message:"Unable to import products");}finally{setBusy(false);}}
 return <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Import products from CSV</h2><p className="mt-1 text-sm text-slate-600">Use explicit name, category, unit, sell_net, stock_controlled, price_basis (net) and cost_vat_rate. For a cost, also confirm purchase_unit. Optional: SKU, cost_net, description, coverage_m2_per_pack and supplier_id. Blank units, VAT and stock flags are not guessed. Unmapped columns are rejected, not discarded. Keep the original Excel workbook unchanged.</p>
  <label className="mt-4 block text-sm font-semibold">Choose CSV file<input type="file" accept=".csv,text/csv" className="mt-2 block w-full text-sm" onChange={async e=>{const file=e.target.files?.[0];e.target.value="";if(!file)return;setPreview(null);setError("");try{if(file.size>2000000)throw new Error("CSV must be under 2MB");const data=convert(parseCsv(await file.text()),file.name);if(data.length>500)throw new Error("Import up to 500 products per batch");setRows(data);}catch(ex){setError(ex instanceof Error?ex.message:"Invalid CSV");setRows([]);}}}/></label>
  {rows.length>0&&<><p className="mt-3 text-sm font-semibold">{rows.length} products selected</p><div className="mt-2 max-h-48 overflow-auto rounded-lg border"><BmsTable className="w-full text-left text-xs"><thead><tr><th className="p-2">Name</th><th className="p-2">SKU</th><th className="p-2">Cost</th><th className="p-2">Selling</th></tr></thead><tbody>{rows.slice(0,30).map((r,i)=><tr key={i} className="border-t"><td className="p-2">{r.name}</td><td className="p-2">{r.sku}</td><td className="p-2">{r.cost_net||"Not set"}</td><td className="p-2">{r.sell_net||"Not set"}</td></tr>)}</tbody></BmsTable></div><div className="mt-3 flex gap-2"><button type="button" disabled={busy} onClick={()=>void submit(false)} className="rounded-lg border px-4 py-2 text-sm font-bold">Validate and preview</button><button type="button" disabled={busy||!preview||preview.issue_count>0||preview.valid_count!==rows.length} onClick={()=>void submit(true)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Confirm import</button></div></>}
  {preview&&<p role="status" className="mt-3 text-sm">{preview.imported?preview.imported+" products imported.":preview.valid_count+" valid, "+preview.issue_count+" issues."}{preview.issues?.map((x:any)=>" Row "+x.row+": "+x.issue).join("; ")}</p>}
  {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
 </section>;
}
