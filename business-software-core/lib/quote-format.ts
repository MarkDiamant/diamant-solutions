/** Shared, tenant-independent quotation formatting and validation. */
export type QuoteLine={description:string;quantity:number;unitPrice:number};
export function normaliseQuoteDescription(input:string){const text=String(input||"").trim();const m=text.match(/^([^:\n]{2,100}):\s*([\s\S]+)$/);if(!m)return text;const label=m[1].trim();let detail=m[2].trim();if(detail.toLowerCase().startsWith(label.toLowerCase()))detail=detail.slice(label.length).replace(/^[\s:.,-]+/,"").trim();return label+": "+detail;}
export function formatQuoteLines(lines:QuoteLine[]){const money=(n:number)=>"£"+n.toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});return lines.map(item=>{if(!item.description.trim()||!Number.isFinite(item.quantity)||item.quantity<=0||!Number.isFinite(item.unitPrice)||item.unitPrice<0)throw Error("Invalid quotation item");const d=normaliseQuoteDescription(item.description).replace(/:\s*$/,"");return d+": "+(item.quantity===1?money(item.unitPrice):item.quantity+" × "+money(item.unitPrice)+" = "+money(item.quantity*item.unitPrice));}).join("\n");}
export function totalQuoteLines(lines:QuoteLine[]){return lines.reduce((sum,item)=>sum+item.quantity*item.unitPrice,0);}
export function quoteAmountFromText(text:string){return String(text||"").split("\n").reduce((sum,line)=>{const matches=[...line.matchAll(/£([\d,]+(?:\.\d{1,2})?)/g)];const last=matches[matches.length-1];return sum+(last?Number(last[1].replace(/,/g,"")):0);},0);}

/** Refuse AI rewrites that drop work items or change any quoted monetary amount. */
export function validateTidiedQuote(before:string,after:string){const lines=(v:string)=>v.split("\n").map(x=>x.trim()).filter(Boolean);const priced=(v:string)=>[...v.matchAll(/£([\d,]+(?:\.\d{1,2})?)/g)].map(m=>Number(m[1].replace(/,/g,"")).toFixed(2)).sort();const a=lines(before),b=lines(after);if(b.length<a.length)throw Error("AI removed quotation lines. Original wording preserved.");const oldPrices=priced(before),newPrices=priced(after);if(JSON.stringify(oldPrices)!==JSON.stringify(newPrices))throw Error("AI changed or removed prices. Original wording preserved.");const oldPriced=a.filter(x=>/£[\d,]+(?:\.\d{1,2})?/.test(x));const newPriced=b.filter(x=>/£[\d,]+(?:\.\d{1,2})?/.test(x));if(oldPriced.some((line,i)=>newPriced[i]!==line))throw Error("AI altered a priced quotation line. Original wording preserved.");return after;}

/** Canonical invoice-style quote lines. Preserve descriptions, numbering and bold markup. */
export function normaliseQuoteScope(input:string){
  return String(input||"").split("\n").map(line=>{
    let out=line.trim();
    // Repair escaped markdown and repeated numbers from old quote saves.
    out=out.replace(/\\\*/g,"*");
    out=out.replace(/^(\d+[.)])\s+\*\*\s*\1\s+/,"**$1 ");
    out=out.replace(/^(\d+[.)])\s+\*\*\s*(\d+[.)])\s+/,"**$1 ");
    out=out.replace(/\.\s+([–-]\s*£[\d,]+(?:\.\d{1,2})?)\s*$/," $1");
    // Remove a duplicated number from earlier rich-text serialization.
    out=out.replace(/^(\d+[.)])\s+\1\s+/,"$1 ");
    // Legacy item arithmetic: show just the amount for a single unit.
    out=out.replace(/\s*\|\s*1\s*[x×]\s*£[\d,]+(?:\.\d{1,2})?\s*=\s*(£[\d,]+(?:\.\d{1,2})?)\s*$/i," – $1");
    out=out.replace(/\s*\|\s*(£[\d,]+(?:\.\d{1,2})?)\s*$/i," – $1");
    out=out.replace(/\s*\|\s*(\d+(?:\.\d+)?)\s*[x×]\s*(£[\d,]+(?:\.\d{1,2})?)\s*=\s*(£[\d,]+(?:\.\d{1,2})?)\s*$/i,(_,qty,unit,total)=>Number(qty)===1?" – "+total:" – "+qty+" × "+unit+" = "+total);
    out=out.replace(/\s*[–-]\s*1\s*[x×]\s*£[\d,]+(?:\.\d{1,2})?\s*=\s*(£[\d,]+(?:\.\d{1,2})?)\s*$/i," – $1");
    return out;
  }).join("\n");
}

/** One-time migration for legacy quotations whose numbers were added only at print time.
 * Existing user-edited numbering is never changed. */
export function seedLegacyQuoteNumbers(input:string){
 const text=normaliseQuoteScope(input);
 const lines=text.split("\n");
 const priced=lines.filter(line=>/£[\d,]+(?:\.\d{1,2})?/.test(line));
 if(priced.length<=1)return text.replace(/^(1[.)])\s+(?=\*\*1[.)]\s)/m,"");
 if(lines.some(line=>/^\s*\d+[.)]\s+/.test(line)))return text;
 let index=0;
 return lines.map(line=>/£[\d,]+(?:\.\d{1,2})?/.test(line)?(++index)+". "+line:line).join("\n");
}
