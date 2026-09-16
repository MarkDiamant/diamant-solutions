'use client';
import {useEffect} from 'react';

const BOOK_URLS={
  single:'https://book.stripe.com/14A8wQgpPd5z9mz4VM1Nu06',
  three:'https://book.stripe.com/fZueVe1uV7LfdCP0Fw1Nu07',
  six:'https://book.stripe.com/8x23cw2yZaXr42f0Fw1Nu08'
};
const support=[
  ['Business direction and difficult decisions','Work through the decisions that are slowing progress and get clear on the most practical route forward.'],
  ['Prioritising an overwhelming task list','Separate what matters now from what can wait, then turn priorities into a realistic action plan.'],
  ['Pricing and profitability','Review pricing, margins and commercial decisions with a practical focus on stronger profitability.'],
  ['Business systems and processes','Improve how work moves through the business so fewer things rely on memory, chasing or firefighting.'],
  ['Client journeys and operational improvements','Identify friction in the customer experience and tighten the operational steps behind it.'],
  ['Accountability and implementation','Agree clear next actions, follow through on them and keep important work moving.'],
  ['Digital, website and automation opportunities','Spot sensible opportunities to use websites, systems or automation where they can genuinely save time or improve results.']
];
const packages=[
  {
    key:'single',
    label:'SINGLE SESSION',
    title:'Single Session',
    price:'£200',
    bullets:['Approximately 50-60 minutes','Focused one-to-one business advisory','Occasional brief questions by WhatsApp between sessions included'],
    button:'Book Single Session'
  },
  {
    key:'three',
    label:'3-SESSION PACKAGE',
    title:'3-Session Package',
    price:'£570',
    saving:'Save £30',
    bullets:['Three approximately 50-60 minute sessions','Suitable for working through a defined set of priorities with accountability between sessions','Occasional brief WhatsApp support between sessions is included, helping you stay on track and keep your business moving'],
    button:'Book 3 Sessions',
    featured:true
  },
  {
    key:'six',
    label:'6-SESSION PACKAGE',
    title:'6-Session Package',
    price:'£1,100',
    saving:'Save £100',
    bullets:['Six approximately 50-60 minute sessions','Best for sustained implementation, accountability and follow-through over a longer period','Occasional brief questions by WhatsApp between sessions included'],
    button:'Book 6 Sessions'
  }
];

function Logo({white=false}){return <img src={white?'/DS Logo with new tagline White.png':'/DS Logo latest tagline.png'} alt="Diamant Solutions" className={white?'footerOfficialLogo':'headerOfficialLogo'}/>}
function Strip(){const set=<div className="advisoryStripSet"><span>Clear decisions</span><b>•</b><span>Practical action</span><b>•</b><span>Accountability</span><b>•</b><span>Implementation</span><b>•</b></div>;return <div className="advisoryStrip"><div className="advisoryStripTrack">{set}{set}</div></div>}

export default function AdvisoryClient(){
  useEffect(()=>{
    const els=[...document.querySelectorAll('.revealAdvisory')];
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in');io.unobserve(entry.target)}}),{threshold:.12,rootMargin:'0px 0px -35px'});
    els.forEach(el=>io.observe(el));
    return()=>io.disconnect();
  },[]);

  return <main className="advisoryPage">
    <header className="advisoryHeader">
      <a href="/"><Logo/></a>
      <nav><a href="/">WEBSITES</a><a className="active" href="/advisory">BUSINESS ADVISORY</a><a href="/#pricing">WEBSITE PRICING</a><a href="/#about">ABOUT</a><a href="/#contact">CONTACT</a></nav>
      <details className="mobileMenu"><summary aria-label="Open menu"><span/></summary><div><a href="/">WEBSITES</a><a href="/advisory">BUSINESS ADVISORY</a><a href="/#pricing">WEBSITE PRICING</a><a href="/#about">ABOUT</a><a href="/#contact">CONTACT</a></div></details>
    </header>

    <section className="advisoryHero">
      <div className="advisoryHeroCopy revealAdvisory fromLeft">
        <p className="advisoryKicker">BUSINESS ADVISORY</p>
        <h1>Less talking about what needs doing.<span>More getting it done.</span></h1>
        <p className="advisoryHeroLead">Practical one-to-one support for business owners who need help making decisions, setting priorities and actually implementing them.</p>
        <div className="advisoryActions"><a className="advisoryPrimary" href="#book">Book a Session</a><a className="advisorySecondary" href="#support">See how I can help</a></div>
      </div>
      <div className="decisionOrbit revealAdvisory fromRight" aria-hidden="true">
        <div className="orbitRing one"/><div className="orbitRing two"/><div className="orbitRing three"/>
        <div className="orbitCore"><div><b>Decide.</b><small>THEN IMPLEMENT.</small></div></div>
        <div className="orbitNode n1">Direction</div><div className="orbitNode n2">Profitability</div><div className="orbitNode n3">Systems</div><div className="orbitNode n4">Accountability</div>
      </div>
    </section>

    <Strip/>

    <section id="support" className="advisorySection">
      <div className="advisorySectionHead revealAdvisory"><p className="advisoryKicker">PRACTICAL SUPPORT</p><h2>Work on the things that actually move the business forward.</h2><p>Sessions focus on the real decisions, bottlenecks and priorities in your business, not a generic coaching framework.</p></div>
      <div className="supportGrid">{support.map((item,i)=><article key={item[0]} className={'supportCard revealAdvisory '+(i%2?'fromRight':'fromLeft')}><h3>{item[0]}</h3><p>{item[1]}</p></article>)}</div>
    </section>

    <section className="tailored">
      <div className="tailoredInner">
        <div className="revealAdvisory fromLeft"><p className="advisoryKicker">TAILORED TO YOUR BUSINESS</p><h2>No fixed programme. No generic formula.</h2></div>
        <div className="tailoredCopy revealAdvisory fromRight"><p>Every business is different. The session is shaped around what is creating pressure, slowing progress or needs a decision now.</p><p>The aim is simple: understand the issue, make the decision, agree the next action and make sure it actually gets implemented.</p><div className="actionSteps"><div className="actionStep"><span>Understand</span></div><div className="actionStep"><span>Decide</span></div><div className="actionStep"><span>Act</span></div><div className="actionStep"><span>Follow through</span></div></div></div>
      </div>
    </section>

    <section className="aboutYehuda">
      <div className="revealAdvisory fromLeft" style={{position:'relative'}}><div className="yehudaAccent"/><div className="yehudaFrame"><img src="/mark-diamant.svg" alt="Mark Diamant"/></div></div>
      <div className="aboutYehudaCopy revealAdvisory fromRight"><p className="advisoryKicker">ABOUT MARK</p><h2>Practical experience, not just theory.</h2><p>Mark Diamant is an entrepreneur and director of multiple businesses, with hands-on experience launching, running and developing businesses and digital projects. He is also actively involved in community organisations and previously spent seven years providing business coaching through Mesila, including delivering business talks and webinars.</p><p>His approach is practical: understand the issue, make a decision, agree the next action and make sure it actually gets implemented.</p></div>
    </section>

    <section id="book" className="advisoryPrice">
      <div className="advisorySectionHead revealAdvisory"><p className="advisoryKicker">BUSINESS ADVISORY PRICING</p><h2>Choose the level of support that fits your business.</h2><p>Each session is tailored to your business and focused on practical decisions, implementation and follow-through.</p></div>
      <div className="advisoryPriceGrid">
        {packages.map((pkg,i)=><article key={pkg.key} className={'advisoryPriceCard revealAdvisory '+(pkg.featured?'featured ':'')+(i===0?'fromLeft':i===2?'fromRight':'')}>
          {pkg.saving&&<div className="packageSaving">{pkg.saving}</div>}
          <small>{pkg.label}</small>
          <h3>{pkg.title}</h3>
          <div className="price">{pkg.price}</div>
          <ul>{pkg.bullets.map(item=><li key={item}>{item}</li>)}</ul>
          <a className="advisoryPrimary bookButton" href={BOOK_URLS[pkg.key]}>{pkg.button}</a>
        </article>)}
      </div>
      <div className="bookingProcess revealAdvisory">
        <p><b>After booking, we’ll contact you by email or WhatsApp to arrange a date and time for your session(s) that works for you.</b></p>
        <p>For multi-session packages, sessions can be arranged individually and do not need to be booked all at once.</p>
      </div>
    </section>

    <footer className="advisoryFooter"><Logo white/><div><b>Diamant Solutions Ltd</b><br/>Professional websites and practical business advisory.</div><div><b>Explore</b><br/><a href="/">Websites</a><br/><a href="/advisory">Business Advisory</a></div><div><b>Contact</b><br/>info@diamantsolutions.co.uk<br/>0203 284 5074<br/><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></div></footer>
  </main>;
}