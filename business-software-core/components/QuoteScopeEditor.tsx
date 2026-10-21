"use client";
import {useEffect,useRef} from "react";
import {normaliseQuoteScope} from "../lib/quote-format";

/** Rich text editor preserving source numbering and bold formatting without browser list auto-numbering. */
export default function QuoteScopeEditor({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const ref=useRef<HTMLDivElement>(null);
 const focused=useRef(false);
 const lastValue=useRef<string|null>(null);
 function render(source:string){
   const host=ref.current;if(!host)return;
   host.replaceChildren();
   const lines=normaliseQuoteScope(source).replace(/\\?\*/g,"").split("\n");
   lines.forEach((line,i)=>{
     if(i)host.appendChild(document.createElement("br"));
     // Mirror the customer quote: numbered item and title bold, final dash and price bold.
     // Explicit **bold** markup takes precedence and remains editable.
     const append=(text:string,bold=false)=>{
       const pieces=text.split(/(\*\*[^*]+\*\*)/g);
       for(const piece of pieces){
         if(!piece)continue;
         const marked=piece.startsWith("**")&&piece.endsWith("**")&&piece.length>4;
         const content=marked?piece.slice(2,-2):piece;
         if(bold||marked){const strong=document.createElement("strong");strong.textContent=content;strong.style.fontWeight="700";if(bold&&!marked)strong.dataset.autoBold="true";host.appendChild(strong);}
         else host.appendChild(document.createTextNode(content));
       }
     };
     const price=line.match(/(\s*[–-]\s*£[\d,]+(?:\.\d{1,2})?)\s*$/);
     const body=price?line.slice(0,-price[0].length):line;
     const title=body.match(/^(\s*(?:\d+[.)]\s*)?[^:\n]+:)/);
     if(title){append(title[0],true);append(body.slice(title[0].length));}
     else append(body);
     if(price)append(price[1],true);
   });
 }
 useEffect(()=>{if(!focused.current&&lastValue.current!==value){render(value);lastValue.current=value;}},[value]);
 function serialize(node:Node):string{
   if(node.nodeType===Node.TEXT_NODE)return node.textContent||"";
   if(node.nodeType!==Node.ELEMENT_NODE)return "";
   const el=node as HTMLElement;
   if(el.tagName==="BR")return "\n";
   const body=Array.from(el.childNodes).map(serialize).join("");
   if(el.dataset.autoBold==="true")return body;
   if(el.tagName==="STRONG"||el.tagName==="B")return "**"+body.replace(/^\*\*|\*\*$/g,"")+"**";
   return body+(["DIV","P"].includes(el.tagName)?"\n":"");
 }
 function save(){
   const host=ref.current;if(!host)return;
   const text=normaliseQuoteScope(Array.from(host.childNodes).map(serialize).join("").replace(/^\n+|\n+$/g,"")).replace(/\\?\*/g,"");
   if(text!==value){lastValue.current=text;onChange(text);}
 }
 return <div className="rounded-xl border border-black/15 bg-white p-3">
  <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-black/45">Edit quotation directly · Select text and press Ctrl+B to bold</div>
  <div ref={ref} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Edit formatted quotation" spellCheck={false}
    style={{fontFamily:"inherit",fontSize:"14px",caretColor:"#141414"}}
    className="min-h-52 cursor-text whitespace-pre-wrap rounded-lg p-2 leading-6 text-[#141414] outline-none focus:ring-2 focus:ring-black/10"
    onFocus={()=>{focused.current=true;}}
    onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="b"){e.preventDefault();document.execCommand("bold");}}}
    onInput={save}
    onBlur={()=>{focused.current=false;save();}}
  />
 </div>;
}
