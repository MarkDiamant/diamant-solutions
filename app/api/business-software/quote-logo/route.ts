import {NextRequest,NextResponse} from "next/server";
export const dynamic="force-dynamic";
// Proxy only approved public logo image hosts and the exact M&J logo path. Never fetch arbitrary URLs.
export async function GET(request:NextRequest){
  const value=request.nextUrl.searchParams.get("url")||"";
  let url:URL;
  try{url=new URL(value);}catch{return NextResponse.json({error:"Invalid logo URL"},{status:400});}
  if(url.protocol!=="https:"||url.port||!((url.hostname==="res.cloudinary.com"&&url.pathname.startsWith("/"))||(url.hostname==="mjmetal.co.uk"&&url.pathname==="/images/logo.png"&&!url.search)))
    return NextResponse.json({error:"Logo host not permitted"},{status:403});
  try{
    const response=await fetch(url.toString(),{redirect:"error",cache:"force-cache",signal:AbortSignal.timeout(10000)});
    if(!response.ok)return NextResponse.json({error:"Logo unavailable"},{status:502});
    const type=response.headers.get("content-type")||"";
    if(!/^image\/(png|jpeg|webp|gif|svg\+xml)(?:;|$)/i.test(type))
      return NextResponse.json({error:"Not an image"},{status:415});
    const size=Number(response.headers.get("content-length")||0);
    if(size>2_000_000)return NextResponse.json({error:"Logo too large"},{status:413});
    const data=await response.arrayBuffer();
    if(data.byteLength>2_000_000)return NextResponse.json({error:"Logo too large"},{status:413});
    return new NextResponse(data,{headers:{"Content-Type":type,"Cache-Control":"private, max-age=3600","X-Content-Type-Options":"nosniff"}});
  }catch{return NextResponse.json({error:"Logo retrieval failed"},{status:502});}
}
