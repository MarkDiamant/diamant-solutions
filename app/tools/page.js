import './tools.css';
import '../zmanim.css';
import {ToolHeader,ToolFooter} from '../../components/ToolShell';
export const metadata={title:"Free Tools | Diamant Solutions",description:"Simple, useful free tools and resources built by Diamant Solutions.",openGraph:{title:"Free Tools | Diamant Solutions",description:"Simple, useful free tools and resources built by Diamant Solutions.",url:"https://diamantsolutions.co.uk/tools",siteName:'Diamant Solutions',images:[{url:"https://diamantsolutions.co.uk/_next/image?url=%2Fog-free-tools.png&w=1200&q=60",width:1200,height:630,type:"image/png",alt:"Free Tools | Diamant Solutions"}],type:'website'},twitter:{card:'summary_large_image',title:"Free Tools | Diamant Solutions",description:"Simple, useful free tools and resources built by Diamant Solutions.",images:["https://diamantsolutions.co.uk/_next/image?url=%2Fog-free-tools.png&w=1200&q=60"]}};
const cards=[['/shkiah','Shkiah Times','Instant local Shkiah times based on your location.'],['/shabbos','Shabbos & Yom Tov Times','Local candle-lighting, Shkiah and ending times, including Yom Tov.'],['/havdalah','Havdalah Hotline','Information and access to the Havdalah Hotline.'],['/yomi','Yomi Today','Today’s Daf Yomi, Amud Yomi, Mishnah Yomi, Nach Yomi, Mishnah Berurah Yomi and more.'],['/yahrzeits','Daily Yahrzeits','Notable Jewish lives remembered on today’s Hebrew date, with Hebrew and English details.']];
const iconPaths = [
  <><path d="M3 17h18M5 21h14M12 3v3M4.9 6.9 7 9M19.1 6.9 17 9"/><path d="M6 17a6 6 0 0 1 12 0"/></>,
  <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18M8 15h2M14 15h2"/></>,
  <path d="M7 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-3l-5-2-2 2a14 14 0 0 1-7-7l2-2-2-5Z"/>,
  <><path d="M12 5v16M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z"/></>,
  <><path d="M8 11h8v10H8zM12 3c-4 4 3 4 0 7-3-1-3-4 0-7Z"/><path d="M5 21h14"/></>,
];
function ToolCard({ card, index }) {
  const [href, title, description] = card;
  return <a href={href} className="toolCard" aria-label={`Open ${title}`}>
    <span className="toolIcon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{iconPaths[index]}</svg></span>
    <h3>{title}</h3>
    <p>{description}</p>
    <span className="toolAction" aria-hidden="true">Open tool<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span>
  </a>;
}
export default function Page() {
  return <><ToolHeader/><main className="toolsPage"><div className="toolsDirectory">
    <div className="toolsIntro"><h1>Free Tools</h1><p>Simple, useful resources built by Diamant Solutions.</p></div>
    <section className="toolsGroup" aria-labelledby="times-heading">
      <h2 className="toolsGroupTitle" id="times-heading">Times &amp; services</h2>
      <div className="toolsGrid">{cards.slice(0, 3).map((card, index) => <ToolCard card={card} index={index} key={card[0]}/>)}</div>
    </section>
    <section className="toolsGroup" aria-labelledby="daily-heading">
      <h2 className="toolsGroupTitle" id="daily-heading">Daily learning &amp; remembrance</h2>
      <div className="toolsGrid toolsGridPair">{cards.slice(3).map((card, index) => <ToolCard card={card} index={index + 3} key={card[0]}/>)}</div>
    </section>
  </div></main><ToolFooter/></>;
}
