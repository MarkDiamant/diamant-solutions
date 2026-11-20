// Model output is source data, never an instruction or a database identifier.
export type DocumentProposal={attachment_id:string;document_kind:string;supplier_name:string|null;currency:string|null;price_basis:string|null;lines:{sku:string|null;name:string|null;unit:string|null;quantity:string|null;unit_cost_net:string|null;unit_sell_net:string|null}[]};
const clean=(v:unknown,max=200)=>typeof v==="string"&&v.trim()&&v.trim().length<=max?v.trim():null;
const decimal=(v:unknown)=>typeof v==="string"&&/^\d{1,7}(\.\d{1,4})?$/.test(v)&&Number(v)<=1000000?v:null;
const kinds=new Set(["supplier_quotation","purchase_order","order_confirmation","delivery_note","supplier_invoice","customer_order","payment_receipt","product_information","other"]);
export function documentReviewResult(raw:string,attachmentIds:string[]){
 let parsed:any;try{parsed=JSON.parse(raw.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,""));}catch{return{answer:raw,document_proposals:[] as DocumentProposal[]};}
 const seen=new Set<string>();const proposals:DocumentProposal[]=[];
 if(parsed&&Array.isArray(parsed.documents))for(const d of parsed.documents.slice(0,3)){
  if(!d||!attachmentIds.includes(d.attachment_id)||seen.has(d.attachment_id))continue;seen.add(d.attachment_id);
  proposals.push({attachment_id:d.attachment_id,document_kind:Array.isArray(d.lines)&&d.lines.length<=100&&kinds.has(d.document_kind)?d.document_kind:"other",supplier_name:clean(d.supplier_name),currency:clean(d.currency,3),price_basis:d.price_basis==="net"?"net":null,lines:Array.isArray(d.lines)&&d.lines.length<=100?d.lines.filter((l:any)=>l&&typeof l==="object").map((l:any)=>({sku:clean(l.sku),name:clean(l.name),unit:clean(l.unit,40),quantity:decimal(l.quantity)&&Number(l.quantity)>0?l.quantity:null,unit_cost_net:decimal(l.unit_cost_net),unit_sell_net:decimal(l.unit_sell_net)})):[]});
 }
 return{answer:clean(parsed?.answer,16000)||"The document was read. Check the original before using any proposed values.",document_proposals:proposals};
}
const normalized=(v:unknown)=>typeof v==="string"?v.trim().replace(/\s+/g," ").toLocaleLowerCase("en-GB"):"";
export function matchDocumentProposal(proposal:DocumentProposal,products:any[],suppliers:any[],kind="supplier_quotation"){
 const supplierMatches=proposal.supplier_name?suppliers.filter(s=>normalized(s.name)===normalized(proposal.supplier_name)):[];
 const eligible=proposal.document_kind===kind&&proposal.currency==="GBP"&&proposal.price_basis==="net";
 const warnings:string[]=[];
 if(!eligible)warnings.push("Automatic draft suggestions require a "+kind.replace(/_/g," ")+" with explicit GBP currency and net unit costs. No invoice, payment or stock action is proposed.");
 const lines=proposal.lines.map((l,i)=>{
  let matches=l.sku?products.filter(p=>normalized(p.sku)===normalized(l.sku)):l.name?products.filter(p=>normalized(p.name)===normalized(l.name)):[];
  // A SKU and product name that disagree need a person, even if one identifier is unique.
  if(l.sku&&l.name)matches=matches.filter(p=>normalized(p.name)===normalized(l.name));
  const p=matches.length===1?matches[0]:null;
  const sameUnit=p&&normalized(l.unit)===normalized(p.unit||"each")&&(!p.purchase_unit||normalized(p.purchase_unit)===normalized(p.unit||"each"));
  if(!p)warnings.push("Line "+(i+1)+": no unique exact saved product match. Choose it after checking the source.");
  else if(!sameUnit)warnings.push("Line "+(i+1)+": unit missing or different. Review the saved unit before entering quantity and cost.");
  return{product_id:eligible&&p?p.id:"",unit:eligible&&p?p.unit||"each":"",quantity:eligible&&sameUnit?l.quantity||"":"",unit_cost_net:eligible&&sameUnit?l.unit_cost_net||"":""};
 });
 const ids=lines.map(l=>l.product_id).filter(Boolean);if(new Set(ids).size!==ids.length)warnings.push("Duplicate product suggestions must be combined after checking the original.");
 return{supplier_id:eligible&&supplierMatches.length===1?supplierMatches[0].id:"",currency:eligible?"GBP":"",lines:eligible?lines:[],warnings};
}

export function documentSalesNet(lines:{quantity:string;agreed_unit_net:string}[]){
 if(!lines.length||lines.length>100)return null;let cents=BigInt(0);
 for(const l of lines){if(!/^\d{1,7}(\.\d{1,4})?$/.test(l.quantity)||!/^\d{1,7}(\.\d{1,6})?$/.test(l.agreed_unit_net)||Number(l.quantity)<=0||Number(l.quantity)>1000000||Number(l.agreed_unit_net)>1000000)return null;const scale=(s:string,p:number)=>{const[w,f=""]=s.split(".");return BigInt(w)*BigInt(10)**BigInt(p)+BigInt(f.padEnd(p,"0"))};cents+=(scale(l.quantity,4)*scale(l.agreed_unit_net,6)+BigInt(50000000))/BigInt(100000000);}
 return cents<=BigInt(10000000000)?(Number(cents)/100).toFixed(2):null;
}
