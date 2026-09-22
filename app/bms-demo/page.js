import SoftwareDemo from "../software/SoftwareDemo";
import "../software/software.css";

export const metadata={title:"Business Management Software Demo | Diamant Solutions",robots:{index:false,follow:false}};

export default function BmsDemoPage(){
 return <main className="softwarePage" style={{minHeight:"100vh",padding:"28px 4vw 60px",background:"#f3f7fa"}}>
  <div style={{maxWidth:1220,margin:"0 auto 18px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:18,flexWrap:"wrap"}}>
   <div><p className="softCap" style={{marginBottom:6}}>DIAMANT SOLUTIONS</p><h1 style={{fontSize:"clamp(30px,4vw,48px)",lineHeight:1.05,margin:0,color:"#17385f"}}>Business Management Software Demo</h1><p style={{margin:"9px 0 0",color:"#68798d"}}>Explore the system safely. This demo cannot change customer data, send emails or create real transactions.</p></div>
   <a href="https://diamantsolutions.co.uk/software" style={{padding:"12px 16px",borderRadius:10,background:"#17385f",color:"#fff",textDecoration:"none",fontWeight:800}}>About Business Software</a>
  </div>
  <SoftwareDemo/>
 </main>
}