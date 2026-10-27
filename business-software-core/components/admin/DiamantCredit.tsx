import type {CSSProperties,ReactNode} from "react";
/** Brand credit can be rendered without a nested anchor inside the dashboard brand link. */
export default function DiamantCredit({compact=false,dark=false,linked=true}:{compact?:boolean;dark?:boolean;linked?:boolean}){
 const style:CSSProperties={display:"inline-flex",alignItems:"center",gap:compact?4:8,textDecoration:"none",whiteSpace:"nowrap",color:dark?"white":"#475569"};
 const content:ReactNode=<><span style={{fontSize:compact?9:11,fontWeight:600,lineHeight:1.2,flexShrink:0}}>{compact?"Powered by":"Built by"}</span><span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",borderRadius:4,background:"#172b4d",padding:compact?"2px":"4px 6px",minHeight:compact?20:28}}><img src="https://www.samcerts.co.uk/diamant-solutions-logo.svg" alt="Diamant Solutions" style={{display:"block",width:compact?68:110,height:compact?16:24,objectFit:"contain"}}/></span>{!compact&&<span style={{fontSize:10}}>Websites · Business Software · Direction</span>}</>;
 return linked?<a href="https://diamantsolutions.co.uk" target="_blank" rel="noopener noreferrer" style={style}>{content}</a>:<span style={style}>{content}</span>;
}
