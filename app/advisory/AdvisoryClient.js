'use client';
import {useEffect} from 'react';

const BOOK_URL='https://book.stripe.com/dRm8wQb5vaXr2Yb73U1Nu05';
const support=[
  ['Business direction and difficult decisions','Work through the decisions that are slowing progress and get clear on the most practical route forward.'],
  ['Prioritising an overwhelming task list','Separate what matters now from what can wait, then turn priorities into a realistic action plan.'],
  ['Pricing and profitability','Review pricing, margins and commercial decisions with a practical focus on stronger profitability.'],
  ['Business systems and processes','Improve how work moves through the business so fewer things rely on memory, chasing or firefighting.'],
  ['Client journeys and operational improvements','Identify friction in the customer experience and tighten the operational steps behind it.'],
  ['Accountability and implementation','Agree clear next actions, follow through on them and keep important work moving.'],
  ['Digital, website and automation opportunities','Spot sensible opportunities to use websites, systems or automation where they can genuinely save time or improve results.']
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
      <div className="advisorySectionHead revealAdvisory"><p className="advisoryKicker">SIMPLE PRICING</p><h2>One focused session. Clear next steps.</h2><p>No packages or complicated programmes. Book a single session and work through what matters most right now.</p></div>
      <article className="advisoryPriceCard revealAdvisory"><small>ONE-TO-ONE BUSINESS ADVISORY</small><h3>Business Advisory Session</h3><div className="price">£200</div><p>A focused one-to-one session to work through your business challenges, make decisions and leave with clear practical next steps.</p><a className="advisoryPrimary bookButton" href={BOOK_URL}>Book a Session</a><p className="bookingNote">Secure online payment. After booking, we will arrange and confirm the meeting time with you.</p></article>
    </section>

    <footer className="advisoryFooter"><Logo white/><div><b>Diamant Solutions Ltd</b><br/>Professional websites and practical business advisory.</div><div><b>Explore</b><br/><a href="/">Websites</a><br/><a href="/advisory">Business Advisory</a></div><div><b>Contact</b><br/>info@diamantsolutions.co.uk<br/>0203 284 5074<br/><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></div></footer>
  </main>;
}