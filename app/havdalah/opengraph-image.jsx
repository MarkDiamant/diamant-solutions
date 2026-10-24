import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Havdalah Hotline: Hear Havdalah live over the phone';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',background:'linear-gradient(120deg,#ffffff 0%,#eef7ff 55%,#0861b7 100%)',fontFamily:'Arial, sans-serif',padding:'48px 60px',color:'#061a3d'}}>
      <div style={{display:'flex',fontSize:29,fontWeight:800,letterSpacing:1,color:'#123c78'}}>DIAMANT SOLUTIONS</div>
      <div style={{display:'flex',flexDirection:'column',marginTop:32}}>
        <div style={{fontSize:100,fontWeight:900,letterSpacing:-4,lineHeight:1}}>HAVDALAH</div>
        <div style={{fontSize:100,fontWeight:900,letterSpacing:-4,lineHeight:1,color:'#0572d4'}}>HOTLINE</div>
      </div>
      <div style={{fontSize:39,fontWeight:600,marginTop:26}}>Hear Havdalah LIVE over the phone</div>
      <div style={{fontSize:27,marginTop:12}}>Free UK-wide service · Three opportunities every week</div>
      <div style={{display:'flex',marginTop:'auto',background:'#0753a0',borderRadius:18,color:'white',padding:'17px 28px',fontSize:46,fontWeight:800}}>0203 912 2476</div>
    </div>, size
  );
}
