// Dedicated fictional stock persistence. Never falls back to live BMS credentials.
const ISOLATED_ORIGIN="https://mhncjudrhevvbmsbvkta.supabase.co";
const TABLE="business_software_demo_stock_state";
function binding(){
 const url=process.env.BMS_DEMO_STOCK_SUPABASE_URL,key=process.env.BMS_DEMO_STOCK_SERVICE_ROLE_KEY;
 if(url!==ISOLATED_ORIGIN||!key)throw Error("Fictional stock storage is not configured");
 // Claim checks supplement a provider-verified key binding, not JWT signature verification.
 try{const parts=key.split(".");if(parts.length!==3)throw Error();const claims=JSON.parse(Buffer.from(parts[1],"base64url").toString("utf8"));if(claims.ref!=="mhncjudrhevvbmsbvkta"||claims.role!=="service_role"||Object.prototype.hasOwnProperty.call(claims,"exp")&&(typeof claims.exp!=="number"||!Number.isFinite(claims.exp)||claims.exp<=Math.floor(Date.now()/1000)))throw Error()}catch{throw Error("Fictional stock storage binding is invalid")}
 return {url,key};
}
export async function demoStockRest(path:string,init:RequestInit={}){
 const {url,key}=binding();
 const method=String(init.method||"GET").toUpperCase();
 if(method==="GET"){
  if(!/^business_software_demo_stock_state\?session_id=eq\.[0-9a-f-]{36}&sample=eq\.(?:northstar|electrical|insurance|studio|consultancy|distribution|flooring)&select=payload&limit=1$/i.test(path)||init.body)throw Error("Invalid fictional stock read");
 }else if(method==="POST"){
  if(path!==TABLE||typeof init.body!=="string")throw Error("Invalid fictional stock write");
  const body=JSON.parse(init.body);if(!/^[0-9a-f-]{36}$/i.test(String(body.session_id))||!new Set(["northstar","electrical","insurance","studio","consultancy","distribution","flooring"]).has(body.sample)||!body.payload||typeof body.payload!=="object"||Array.isArray(body.payload))throw Error("Invalid fictional stock record");
 }else throw Error("Invalid fictional stock method");
 // Auth and destination cannot be overridden by callers. No redirect or implicit retry.
 const headers=new Headers(init.headers);headers.set("apikey",key);headers.set("Authorization","Bearer "+key);headers.set("Content-Type","application/json");
 return fetch(url+"/rest/v1/"+path,{...init,method,headers,cache:"no-store",redirect:"error"});
}
