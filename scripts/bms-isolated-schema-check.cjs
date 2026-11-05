"use strict";
const {preflight}=require("./bms-test-preflight.cjs");
// Read-only schema smoke test. Uses service-role only against a verified isolated project.
async function run(env=process.env,fetcher=global.fetch){
 const check=preflight(env);if(!check.ok)throw Error(check.errors.join("; "));
 const base=env.DS_SUPABASE_URL,key=env.DS_SUPABASE_SERVICE_ROLE_KEY;
 const tables=["business_software_tenants","business_software_users","business_software_price_book_items","business_software_purchase_order_lines","business_software_job_material_requirements","business_software_job_stock_reservations","business_software_stock_movements","business_software_invoices","business_software_payments","business_software_integrations","business_software_onboarding_reviews","checkout_orders","tenant_members"];
 const results=[];
 for(const table of tables){
  const r=await fetcher(base+"/rest/v1/"+table+"?select=*&limit=0",{headers:{apikey:key,Authorization:"Bearer "+key,Prefer:"count=exact"},cache:"no-store"});
  if(!r.ok)throw Error("Missing schema or permissions for "+table+" (HTTP "+r.status+"): "+(await r.text()).slice(0,250));
  results.push(table);
 }
 const vat=await fetcher(base+"/rest/v1/business_software_purchase_order_lines?select=vat_rate_snapshot,vat_amount_snapshot,line_total_gross_snapshot&limit=0",{headers:{apikey:key,Authorization:"Bearer "+key},cache:"no-store"});
 if(!vat.ok)throw Error("Future purchase-order VAT snapshot migration not applied");
 const archive=await fetcher(base+"/rest/v1/rpc/bms_archived_product_delete_statuses",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({p_tenant:"00000000-0000-4000-8000-000000000000"})});
 if(!archive.ok)throw Error("Archive reference-guard migration not applied");
 return {schema:"PASS",tables_checked:results.length,vat_snapshot:"PASS",archive_guard:"PASS",writes:0};
}
if(require.main===module)run().then(x=>console.log(JSON.stringify(x,null,2))).catch(e=>{console.error("ISOLATED SCHEMA CHECK FAILED:",e.message);process.exitCode=1});
module.exports={run};
