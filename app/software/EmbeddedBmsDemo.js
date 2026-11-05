'use client';
import {useState} from 'react';
const samples=[['northstar','Property & Projects'],['electrical','Electrical'],['insurance','Insurance'],['studio','Creative Studio'],['consultancy','Consultancy'],['distribution','Distribution']];
/** Keep the sales-page preview in one iframe. The previous /bms-demo wrapper
 * embedded /bms-runtime in a second iframe, creating competing viewport and
 * scroll contexts for the runtime navigation. Standalone BMS is unchanged. */
export default function EmbeddedBmsDemo(){
 const [sample,setSample]=useState('northstar');
 return <div className="embeddedBmsDemo">
  <div className="embeddedBmsChooser" role="group" aria-label="Choose demo business"><strong>Demo business:</strong>{samples.map(([key,label])=><button type="button" key={key} aria-pressed={sample===key} onClick={()=>setSample(key)}>{label}</button>)}</div>
  <iframe key={sample} src={`/bms-runtime?sample=${encodeURIComponent(sample)}`} title="Diamant Solutions BMS interactive demo" loading="lazy" allow="clipboard-write"/>
 </div>;
}
