import SoftwareDemo from "../software/SoftwareDemo";
import "../software/software.css";
export const metadata={title:"Business Software Demo",robots:{index:false,follow:false}};
export default function BmsEmbed(){return <main className="softwarePage" style={{background:"#f3f7fa",padding:"4px"}}><SoftwareDemo/></main>}
