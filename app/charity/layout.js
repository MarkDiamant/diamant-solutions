const title='Charity Management Software | Diamant Solutions';
const description='Bespoke charity management software built around your charity. Manage donors, donations, Gift Aid, box collections and events, configured around the way your charity actually works.';
const image='https://diamantsolutions.co.uk/charity-og.jpg';
export const metadata={title,description,alternates:{canonical:'https://diamantsolutions.co.uk/charity'},openGraph:{type:'website',siteName:'Diamant Solutions',title,description,url:'https://diamantsolutions.co.uk/charity',images:[{url:image,width:1600,height:900,type:'image/jpeg',alt:'Diamant Solutions charity management software'}]},twitter:{card:'summary_large_image',title,description,images:[image]}};
export default function CharityLayout({children}){return children;}
