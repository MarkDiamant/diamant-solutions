import {NextRequest,NextResponse} from "next/server";
import {GET as fictionalWorkspace} from "../[...path]/route";
export const dynamic="force-dynamic";
const response=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
// Fixture adapter only. No live tenant, database, inventory or accounting calls.
export async function GET(req:NextRequest){
 const source=await fictionalWorkspace(req,{params:Promise.resolve({path:["purchasing","workspace"]})});
 if(!source.ok)return response({error:"Fictional purchasing fixtures unavailable"},503);
 const workspace=await source.json(),jobs=workspace.jobs||[],products=workspace.products||[];
 const orders=(workspace.orders||[]).map((order:any,index:number)=>({...order,reference:jobs.find((j:any)=>j.id===order.job_id)?.reference||"",po_number:"DEMO-PO-"+String(index+1).padStart(3,"0")}));
 const lines=(workspace.lines||[]).map((line:any)=>{const product=products.find((p:any)=>p.id===line.product_id);return {...line,order_id:line.material_order_id,name:line.description,quantity:Number(line.ordered_quantity||0),received_qty:Number(line.received_quantity||0),cost_net:Number(line.unit_cost_net||0),vat_rate:20,unit:product?.unit||"piece",sku:product?.sku||"",supplier:"Fictional demo supplier"}});
 const ref=req.nextUrl.searchParams.get("job_orders"),jobId=req.nextUrl.searchParams.get("job_id");
 if(ref!==null){const job=jobs.find((j:any)=>j.id===jobId&&j.reference===ref);if(!job)return response({error:"Select an exact fictional job reference"},409);const selected=orders.filter((o:any)=>o.job_id===job.id);return response({demo:true,simulation:true,job_id:job.id,job_reference:ref,complete:true,orders:selected,lines:lines.filter((l:any)=>selected.some((o:any)=>o.id===l.order_id)),legacy_orders:[],legacy_lines:[],products});}
 const orderId=req.nextUrl.searchParams.get("order");if(orderId&&!orders.some((o:any)=>o.id===orderId))return response({error:"Fictional order not found"},404);
 return response({demo:true,simulation:true,orders,products,suppliers:workspace.suppliers||[],jobs,locations:workspace.locations||[],lines:orderId?lines.filter((l:any)=>l.order_id===orderId):[],history:lines,movements:[],audits:[]});
}
export async function POST(){return response({error:"This read-only fictional purchasing preview does not save orders. No live records changed.",demo:true,simulation:true},409);}
