'use client';
/** Website preview uses the BMS's own View demo as selector and DEMO MODE banner.
 * The runtime stays fictional and isolated; standalone BMS navigation is unchanged. */
export default function BmsDemoPage(){
 return <main style={{margin:0,minHeight:'100vh',background:'#f5f5f2'}}>
  <iframe src="/bms-runtime?sample=northstar" title="Diamant Solutions Business Management Software demo" style={{display:'block',width:'100%',height:'100vh',border:0}}/>
 </main>;
}
