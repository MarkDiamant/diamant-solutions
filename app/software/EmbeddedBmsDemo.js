'use client';
/** The embedded BMS owns its own View demo as selector and DEMO MODE banner.
 * Keep exactly one iframe so its sidebar and responsive layout remain intact. */
export default function EmbeddedBmsDemo(){
 return <div className="embeddedBmsDemo">
  <iframe src="/bms-runtime?sample=northstar" title="Diamant Solutions BMS interactive demo" loading="lazy" allow="clipboard-write"/>
 </div>;
}
