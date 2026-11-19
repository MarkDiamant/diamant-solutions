import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=source('business-software-core/components/admin/ProductCsvImport.tsx');
const helper=ui.slice(ui.indexOf('type Row='),ui.indexOf('export default function ProductCsvImport'));
const compiled=ts.transpileModule(helper+'\nglobalThis.csvHelpers={parseCsv,convert};',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const sandbox={};vm.runInNewContext(compiled,sandbox);const {parseCsv,convert}=sandbox.csvHelpers;
const header='name,sku,category,unit,purchase_unit,cost_net,sell_net,stock_controlled,cost_vat_rate,price_basis,coverage_m2_per_pack';
test('CSV preserves source precision, metadata and unresolved fields without category/unit/stock defaults',()=>{
 const csv=header+'\nFictional oak,TEST,,,box,12.0778333,22.00,,20,net,2.2';const [row]=convert(parseCsv(csv),'fictional.csv');
 assert.equal(row.cost_net,'12.0778333');assert.equal(row.sell_net,'22.00');assert.equal(row.coverage_m2_per_pack,'2.2');assert.equal(row.unit,'');assert.equal(row.category,'');assert.equal(row.stock_controlled,null);assert.equal(row.source_file,'fictional.csv');assert.equal(row.source_row,2);
});
test('explicit stock booleans are parsed but unknown text stays unresolved',()=>{
 for(const [flag,expected] of [['yes',true],['false',false],['service',null],['',null]]){const [row]=convert(parseCsv(header+'\nFictional oak,TEST,Flooring,box,box,1,2,'+flag+',20,net,2.2'),'f.csv');assert.equal(row.stock_controlled,expected);}
});
test('CSV rejects unmapped and duplicate headings, extra values and unclosed quoted fields',()=>{
 assert.throws(()=>convert(parseCsv('name,private_notes\nFictional oak,keep'),'f.csv'),/Unmapped headings/);
 assert.throws(()=>convert(parseCsv('name,product_name\nA,B'),'f.csv'),/same field/);
 assert.throws(()=>convert(parseCsv('name\nA,extra'),'f.csv'),/beyond the headings/);
 assert.throws(()=>parseCsv('name\n"unclosed'),/unclosed quoted/);
 const rows=parseCsv('name,description\n"A, oak","Line 1\nLine 2"');assert.equal(rows[1][0],'A, oak');assert.equal(rows[1][1],'Line 1\nLine 2');
});
test('actual import route branch preserves all fields, tenant binding and permission gate',async()=>{
 const route=source('app/api/bms-live/[...path]/route.ts');const start=route.indexOf('if(p==="operations/import-products")');const end=route.indexOf('\nif(',start+4);const branch=route.slice(start,end);
 const run=new (Object.getPrototypeOf(async function(){}).constructor)('p','member','req','tenantId','canBms','centralRest','NextResponse',ts.transpileModule(branch,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText);
 let captured,calls=0;const centralRest=async(path,options)=>{calls++;captured={path,...JSON.parse(options.body)};return Response.json({valid_count:0,issue_count:1})};
 const NextResponse={json:Response.json};const rows=[{name:'Fictional',unit:'',stock_controlled:null,cost_net:'12.0778333',coverage_m2_per_pack:'2.2',unmapped:'must reach validator'}];
 let response=await run('operations/import-products',{},new Request('https://fixture.invalid',{method:'POST',body:JSON.stringify({rows,confirm:false})}),'tenant-fixture',()=>true,centralRest,NextResponse);
 assert.equal(response.status,200);assert.deepEqual(captured.p_rows,rows);assert.equal(captured.p_tenant,'tenant-fixture');assert.equal(captured.p_preview,true);assert.equal(captured.path,'rpc/bms_import_products');
 response=await run('operations/import-products',{},new Request('https://fixture.invalid',{method:'POST',body:JSON.stringify({rows})}),'tenant-fixture',()=>false,centralRest,NextResponse);assert.equal(response.status,403);assert.equal(calls,1);
 response=await run('operations/import-products',{},new Request('https://fixture.invalid',{method:'POST',body:JSON.stringify({rows:[null]})}),'tenant-fixture',()=>true,centralRest,NextResponse);assert.equal(response.status,400);assert.equal(calls,1);
});
test('strict DB migration retains service-only grants, trigger and all-or-nothing validation',()=>{
 const sql=source('supabase/migrations/20261119174500_bms_strict_product_import.sql');assert.match(sql,/cost_net TYPE numeric\(18,8\)/);assert.match(sql,/CREATE TRIGGER bms_price_history_on_item/);assert.match(sql,/Unsupported fields/);assert.match(sql,/Different purchase and stock units/);assert.match(sql,/jsonb_typeof\(r->'stock_controlled'\) IS DISTINCT FROM 'boolean'/);assert.match(sql,/Nothing imported/);assert.match(sql,/pg_advisory_xact_lock/);assert.doesNotMatch(sql,/grant .* to (anon|authenticated)/i);assert.doesNotMatch(sql,/security definer/i);
});
