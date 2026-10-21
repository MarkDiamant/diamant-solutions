"use client";
import {useRef} from "react";
import {bmsQuoteScope} from "../lib/presentation";

/** WYSIWYG quote scope editor. Saves the visible text, preserving line breaks and user bold. */
export default function QuoteScopeEditor({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const changed=useRef(false);
 function serialize(node:Node):string{
  if(node.nodeType===Node.TEXT_NODE)return node.textContent||"";
  if(node.nodeType!==Node.ELEMENT_NODE)return "";
  const el=node as HTMLElement;
  if(el.tagName==="BR")return "\n";
  const body=Array.from(el.childNodes).map(serialize).join("");
  if(el.tagName==="STRONG"||el.tagName==="B")return "**"+body.replace(/^\*\*|\*\*$/g,"")+"**";
  return body+(["DIV","P"].includes(el.tagName)?"\n":"");
 }
 return <div className="rounded-xl border border-black/15 bg-white p-3">
  <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-black/45">Edit quotation directly · Select text and press Ctrl+B to bold</div>
  <div contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Edit formatted quotation" spellCheck
   className="min-h-52 whitespace-pre-wrap rounded-lg p-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-black/10"
   onInput={()=>{changed.current=true}}
   onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="b"){e.preventDefault();document.execCommand("bold");changed.current=true;}}}
   onBlur={e=>{if(!changed.current)return;changed.current=false;const text=Array.from(e.currentTarget.childNodes).map(serialize).join("").replace(/^\*\*(\d+[.)])\*\*\s*/gm,"").replace(/\n{3,}/g,"\n\n").trim();onChange(text);}}
  >{bmsQuoteScope(value)}</div>
 </div>;
}
