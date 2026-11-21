const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),ts=require('typescript');
let reads=0;
const context={exports:{},require:n=>{assert.equal(n,'next/server');return {NextResponse:{json:(body,options)=>({body,...options})}}},fetch:()=>{throw Error('Provider access forbidden')}};
vm.createContext(context);
vm.runInContext(ts.transpileModule(fs.readFileSync('app/api/business-software/set-password/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
(async()=>{const r=await context.exports.POST({get url(){reads++;throw Error('Request read forbidden')},json(){reads++;throw Error('Body read forbidden')}});assert.equal(r.status,410);assert.equal(reads,0);assert.equal(r.headers['Cache-Control'],'no-store');assert.equal(r.headers['Referrer-Policy'],'no-referrer');assert(!JSON.stringify(r).includes('password:'));console.log('PASS retired legacy route returns410 without request, provider, database or privileged imports. Does not prove old invocation drain.');})().catch(e=>{console.error(e);process.exitCode=1});
