import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("quote edit RPC refreshes a carried valid_until to the business date plus 30 and honours deliberate changes",()=>{
 const m=source("supabase/migrations/20261118220000_bms_quote_edit_valid_until_refresh.sql");
 assert.match(m,/CREATE OR REPLACE FUNCTION public\.bms_job_action/i);
 // deliberate manual change (differs from previous version) is honoured
 assert.match(m,/p_data \? 'valid_until' and nullif\(p_data->>'valid_until',''\)::date is distinct from q\.valid_until/i);
 // carried/unchanged value is recomputed as the business calendar date plus 30 days
 assert.match(m,/else v_business_date \+ 30 end/i);
 // the old carry-forward behaviour is gone
 assert.doesNotMatch(m,/case when p_data \? 'valid_until' then nullif\(p_data->>'valid_until',''\)::date else q\.valid_until end/i);
});

test("business date uses the tenant timezone setting with the platform Europe/London fallback, never bare UTC current_date",()=>{
 const m=source("supabase/migrations/20261118220000_bms_quote_edit_valid_until_refresh.sql");
 assert.match(m,/now\(\) at time zone coalesce\(nullif\(\(select s\.timezone from business_software_tenant_settings s where s\.tenant_id=p_tenant\),''\),'Europe\/London'\)/i);
 assert.doesNotMatch(m,/else current_date \+ 30/i);
});

test("edit quote forms default valid_until to the local business calendar date plus 30 calendar days, never the stale value or a UTC-shifted date",()=>{
 const dash=source("business-software-core/components/admin/CrmDashboardV3.tsx");
 const job=source("business-software-core/components/admin/JobDetail.tsx");
 for(const [name,src] of [["CrmDashboardV3",dash],["JobDetail",job]]){
  assert.doesNotMatch(src,/defaultValue=\{(quickFull\?\.quotes\?\.\[0\]\?\.valid_until\|\||latest\?\.valid_until\|\|)/,name+" must not default from the previous version");
  assert.match(src,/defaultValue=\{\(\(\)=>\{const d=new Date\(\);d\.setDate\(d\.getDate\(\)\+30\);return d\.getFullYear\(\)\+"-"\+String\(d\.getMonth\(\)\+1\)\.padStart\(2,"0"\)\+"-"\+String\(d\.getDate\(\)\)\.padStart\(2,"0"\);\}\)\(\)\}/,name+" must use local calendar arithmetic");
  assert.doesNotMatch(src,/Date\.now\(\)\+30\*86400000\)\.toISOString/,name+" must not use UTC-shifted epoch arithmetic");
 }
});

test("30 calendar day validity crosses month, year, leap and BST boundaries exactly",()=>{
 // local calendar arithmetic identical to the UI expression
 const compute=(y,m,d,days)=>{const dt=new Date(y,m-1,d+days);return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0");};
 assert.equal(compute(2026,11,18,30),"2026-12-18");
 assert.equal(compute(2026,12,20,30),"2027-01-19");
 assert.equal(compute(2026,1,30,30),"2026-03-01");
 assert.equal(compute(2024,2,10,30),"2024-03-11"); // leap year
 assert.equal(compute(2026,2,10,30),"2026-03-12"); // non-leap year
 assert.equal(compute(2026,11,9,30),"2026-12-09"); // MJ044 terms window
 // BST clock-change weekends: calendar arithmetic is unaffected
 assert.equal(compute(2026,3,1,30),"2026-03-31"); // across 29 Mar 2026 spring forward
 assert.equal(compute(2026,10,1,30),"2026-10-31"); // across 25 Oct 2026 fall back
 // business date in the BST midnight hour: 2026-07-15 23:30 UTC is 2026-07-16 00:30 in London
 const fmt=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"});
 assert.equal(fmt.format(new Date("2026-07-15T23:30:00Z")),"2026-07-16"); // UTC date would be 07-15
 // winter midnight hour: 2026-11-18 23:30 UTC is 2026-11-18 23:30 in London (GMT)
 assert.equal(fmt.format(new Date("2026-11-18T23:30:00Z")),"2026-11-18");
});
