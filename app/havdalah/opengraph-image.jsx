import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Havdalah Hotline | Hear Havdalah live by phone, weekly times and local Rabbonim endorsement';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const features = [
  ['☎', 'LIVE BY PHONE', 'Listen to Havdalah live'],
  ['▦', 'WEEKLY TIMES', 'Check this week’s schedule'],
  ['ⓘ', 'HOW IT WORKS', 'Call at the listed time'],
  ['✓', 'ENDORSED', 'By local Rabbonim'],
];

export default function Image() {
  return new ImageResponse(
    <div style={{display:'flex',flexDirection:'column',width:'100%',height:'100%',fontFamily:'Arial, sans-serif',background:'linear-gradient(125deg,#ffffff 0%,#eaf5ff 58%,#7db9ed 100%)',color:'#06113c'}}>
      <div style={{display:'flex',flexDirection:'column',flex:1,padding:'29px 43px 0'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div style={{display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',fontSize:36,fontWeight:900,letterSpacing:-1}}>DIAMANT <span style={{color:'#0865d6',marginLeft:9}}>SOLUTIONS</span></div>
            <div style={{display:'flex',fontSize:12,letterSpacing:1.2,marginTop:5}}>WEBSITES  |  BUSINESS MANAGEMENT SOFTWARE  |  BUSINESS ADVISORY</div>
          </div>
          <div style={{display:'flex',background:'#075ac3',color:'white',padding:'12px 19px',borderRadius:6,fontSize:16,fontWeight:700}}>BESPOKE SOLUTIONS FOR REAL BUSINESSES</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',marginTop:48}}>
          <div style={{display:'flex',fontSize:112,fontWeight:900,lineHeight:1,letterSpacing:-4}}>HAVDALAH</div>
          <div style={{display:'flex',fontSize:112,fontWeight:900,lineHeight:1,letterSpacing:-4,color:'#065bd0'}}>HOTLINE</div>
          <div style={{display:'flex',fontSize:29,fontWeight:700,marginTop:19,maxWidth:960}}>Hear Havdalah live over the phone when you cannot make it yourself.</div>
        </div>
      </div>
      <div style={{display:'flex',background:'rgba(255,255,255,0.94)',padding:'16px 28px',justifyContent:'space-around',borderTop:'2px solid #b3d9fb'}}>
        {features.map(([symbol,heading,description],i)=><div key={heading} style={{display:'flex',flexDirection:'column',alignItems:'center',width:270,borderRight:i<3?'1px solid #8dbff5':'none',padding:'0 8px'}}>
          <div style={{display:'flex',fontSize:28,color:'#075bc9',fontWeight:800}}>{symbol}</div>
          <div style={{display:'flex',fontSize:19,fontWeight:900,marginTop:4}}>{heading}</div>
          <div style={{display:'flex',fontSize:16,marginTop:5,textAlign:'center'}}>{description}</div>
        </div>)}
      </div>
      <div style={{display:'flex',background:'#0756bc',color:'white',justifyContent:'center',alignItems:'center',height:56,fontSize:30,fontWeight:800}}>diamantsolutions.co.uk/havdalah</div>
    </div>, size
  );
}
