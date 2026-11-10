"use strict";
const fs=require("node:fs"),path=require("node:path");
// Run inside each tenant checkout BEFORE opening its shared-core upgrade PR.
// A tenant may own branding, configuration and route adapters, never duplicated BMS behavior.
const forbidden=[
 /^business-software-core\//,
 /^components\/admin\/(?:CrmDashboardV3|CrmDashboardV5|JobDetail|NewJobFormV2|UnsavedFullJobWorkspace|QuotePrint|QuotePdfActions)\.(?:tsx|ts|jsx|js)$/,
 /^lib\/crm\/(?:ruby-quote|simple-pdf|quote-format|presentation)\.(?:tsx|ts|jsx|js)$/
];
function inspect(files,packageJson){
 const problems=[];
 if(!packageJson.dependencies?.["@markdiamant/business-software-core"])problems.push("Missing canonical package dependency");
 for(const name of files){if(forbidden.some(rx=>rx.test(name)))problems.push("Potential duplicated BMS implementation: "+name)}
 return problems;
}
function walk(dir,base=""){let a=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(["node_modules",".git",".next"].includes(entry.name))continue;const name=base?base+"/"+entry.name:entry.name;if(entry.isDirectory())a.push(...walk(path.join(dir,entry.name),name));else a.push(name)}return a}
if(require.main===module){const dir=process.argv[2]||process.cwd();try{const pkg=JSON.parse(fs.readFileSync(path.join(dir,"package.json"),"utf8"));const errors=inspect(walk(dir),pkg);if(errors.length){console.error(errors.join("\n"));process.exitCode=1}else console.log("No forbidden canonical implementation copies found; manual adapter audit still required.")}catch(e){console.error(e.message);process.exitCode=2}}
module.exports={inspect};
