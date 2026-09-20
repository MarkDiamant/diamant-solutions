'use client';
import {useEffect} from 'react';

const journey=[
  ['Tell Us About Your Business','Tell us what you do and how you currently run things.'],
  ['Choose What You Need','Choose your website or business management software, users and billing.'],
  ['We Set It Up For You','We configure everything around the way your business works.'],
  ['Review','You try it, we make the agreed adjustments and get everything ready.'],
  ['Go Live','Your new website or business software goes live.'],
  ['We Keep It Managed','Hosting, support and reasonable ongoing adjustments are included.']
];

const demoTypes=[
  ['Property Management','Properties, landlords, tenants, contractors, maintenance jobs, documents and payments.',['Oak House','Boiler repair · Contractor booked','£1,850'],['12 Finchley Road','Tenant inspection · Today','£420'],['North London Estates','Rent statement sent','£6,150']],
  ['Insurance & Brokerage','Clients, policies, renewals, follow-ups, documents, notes and payments.',['J Cohen Ltd','Policy renewal · 14 days','£3,200'],['Apex Retail','Documents requested · Today','£980'],['Greenway Foods','Premium received','£4,750']],
  ['Trades & Contractors','Enquiries, site visits, jobs, teams, quotes, materials, invoices and payments.',['ABC Property Ltd','Site visit booked · Today','£2,450'],['John Smith','Quote ready to send','£1,280'],['North London Estates','Payment received','£1,250']],
  ['Creative & Digital Agencies','Clients, projects, tasks, approvals, files, quotes, invoices and deadlines.',['Acme Foods','Homepage approval due','£2,800'],['Harper & Co','Brand files received','£1,650'],['Northstar','Invoice due Friday','£3,400']],
  ['Professional Services','Clients, cases, tasks, documents, billing, follow-ups and team activity.',['J Patel','Documents to review','£1,200'],['Aster Holdings','Follow-up due today','£2,750'],['M Green','Invoice paid','£850']],
  ['Wholesale & Distribution','Customers, orders, quotes, stock notes, documents, payments and activity.',['Metro Stores','Order ready to dispatch','£4,820'],['Riverside Ltd','Quote awaiting approval','£2,190'],['Central Foods','Payment received','£3,600']]
];

function addAdvisoryHomepageContent(){
  if(window.location.pathname!=='/')return;
  document.querySelectorAll('header nav').forEach(nav=>{
    if(nav.querySelector('[data-advisory-nav]'))return;
    const link=document.createElement('a'); link.href='/advisory'; link.textContent='BUSINESS ADVISORY'; link.dataset.advisoryNav='true';
    const about=[...nav.querySelectorAll('a')].find(a=>a.getAttribute('href')==='#about'); nav.insertBefore(link,about||null);
  });
  const mobile=document.querySelector('.mobileMenu div');
  if(mobile&&!mobile.querySelector('[data-advisory-nav]')){
    const link=document.createElement('a'); link.href='/advisory'; link.textContent='BUSINESS ADVISORY'; link.dataset.advisoryNav='true';
    const about=[...mobile.querySelectorAll('a')].find(a=>a.getAttribute('href')==='#about'); mobile.insertBefore(link,about||null);
  }
  if(!document.querySelector('.homeAdvisory')){
    const contact=document.querySelector('.contact');
    if(contact){
      const section=document.createElement('section'); section.className='homeAdvisory';
      section.innerHTML='<div class="homeAdvisoryGlow one"></div><div class="homeAdvisoryGlow two"></div><div class="homeAdvisoryInner reveal"><div class="homeAdvisoryCopy"><p class="cap">WE ALSO DO BUSINESS ADVISORY</p><h2>Practical support to turn plans into action.</h2><p>One-to-one support for business owners who need clarity, accountability and practical help implementing the things they already know need to get done.</p><a class="homeAdvisoryBtn" href="/advisory">Explore Business Advisory</a></div><div class="homeAdvisoryGrid">'+['Business direction and decision-making','Priorities and implementation','Pricing and profitability','Systems and processes','Accountability and follow-through'].map(item=>'<div class="homeAdvisoryItem"><span>'+item+'</span></div>').join('')+'</div></div>';
      contact.parentNode.insertBefore(section,contact); requestAnimationFrame(()=>section.querySelector('.reveal')?.classList.add('in'));
    }
  }
  const footer=document.querySelector('footer');
  if(footer&&!footer.classList.contains('homeUnifiedFooter')){
    footer.classList.add('homeUnifiedFooter');
    footer.innerHTML='<img src="/DS Logo with new tagline White.png" alt="Diamant Solutions" class="footerOfficialLogo"/><div><b>Diamant Solutions Ltd</b><br/>Professional websites, business management software and practical business advisory.</div><div><b>Explore</b><br/><a href="/#pricing">Websites & Business Software</a><br/><a href="/advisory">Business Advisory</a></div><div><b>Contact</b><br/>info@diamantsolutions.co.uk<br/>0203 284 5074<br/><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></div>';
  }
}

function updatePositioning(){
  const hero=document.querySelector('.heroCopy');
  if(hero){
    const h=hero.querySelector('h1'); const p=hero.querySelector('p');
    if(h)h.innerHTML='Professional Websites & Business Software<br/><span>Built Around Your Business</span>';
    if(p)p.textContent='Simple, easy-to-use business management software and professional websites, set up and managed for you.';
  }
  document.querySelectorAll('.motionStatement .seamlessSet span').forEach((el,i)=>{
    const row=i%6;
    if(row===0||row===3)el.textContent='Websites & Business Software. Managed For You.';
  });
  const why=document.querySelector('.why');
  if(why){
    const p=why.querySelector('div>p'); if(p)p.textContent='Professional websites and simple business management software, configured around the way you work and supported by us.';
    const items=['Set up around your business','Simple, clean and easy to use','Hosting, support & updates included','Reasonable ongoing adjustments included','Useful new features added as we improve','Built to grow with your business'];
    why.querySelectorAll('.whyList p').forEach((row,i)=>{const span=row.querySelector('span');if(span&&items[i])span.textContent=items[i];row.querySelector('b')?.remove();});
  }
  const about=document.querySelector('#about p');
  if(about)about.textContent='Diamant Solutions builds professional websites and simple business management software for businesses that want everything organised in one place. We set it up around the way you work, keep it managed, and help adapt it as your business changes.';
  const pricing=document.querySelector('.pricing');
  if(pricing){
    const h=pricing.querySelector(':scope > h2'); if(h)h.innerHTML='Websites & Business Software.<br/>Built Around Your Business.';
    const lead=pricing.querySelector('.pricingLead'); if(lead)lead.textContent='Straightforward pricing, setup and ongoing support included.';
  }
}

function buildBusinessPricing(){
  const old=document.querySelector('.crmPricing'); if(!old)return;
  old.id='business-software'; old.className='crmPricing businessPricing';
  old.innerHTML='<p class="cap">BUSINESS MANAGEMENT SOFTWARE</p><h3>Run your business in one simple place.</h3><p>From a straightforward CRM to complete job management. Customers, enquiries, jobs, quotes, invoices, payments, staff, files and more, configured around the way your business works.</p><div class="businessHighlights"><span>Setup included</span><span>Hosting included</span><span>Support included</span><span>Ongoing reasonable adjustments included</span></div><div class="businessConfigurator"><div class="configMain"><small>YOUR BUSINESS SOFTWARE</small><h4>One complete system. No feature tiers.</h4><p>Choose how many people need access. Add the AI Assistant if you want voice and text help across your system.</p><div class="configRow"><div><b>Users</b><small>2 users included</small></div><div class="stepper"><button type="button" data-user-minus aria-label="Remove user">−</button><strong data-users>2</strong><button type="button" data-user-plus aria-label="Add user">+</button></div></div><label class="aiToggle"><input type="checkbox" data-ai/><span><b>AI Assistant</b><small>Optional · voice + text · £15/month</small></span></label><div class="billingToggle"><button type="button" class="active" data-billing="monthly">Monthly</button><button type="button" data-billing="annual">Annual <span>2 months free</span></button></div></div><div class="configPrice"><small>TOTAL</small><div><strong data-price>£49</strong><span data-period>/month</span></div><p data-breakdown>Includes 2 users</p><a class="blueBtn" data-bms-start href="/setup">Get Started</a><small class="managedNote">We set it up for you and keep it managed.</small></div></div><div class="includedGrid"><article><b>Manage the day-to-day</b><p>Customers, jobs, tasks, quotes, invoices, payments, staff, costs, files and more.</p></article><article><b>Connect the tools you use</b><p>Integrations can include Xero, email, Gmail, calendars and other services your workflow needs.</p></article><article><b>We keep adapting it</b><p>Reasonable ongoing adjustments are included. If your business changes, tell us and we will help adapt your setup.</p></article></div><p class="crmFine">£49/month includes 2 users. Each additional user is £10/month. Annual billing gives two months free. AI Assistant is £15/month per business, or £150/year. Major bespoke development outside the normal product may be quoted separately.</p>';
  let users=2, ai=false, annual=false;
  const render=()=>{
    const monthly=49+Math.max(0,users-2)*10+(ai?15:0);
    const price=annual?monthly*10:monthly;
    old.querySelector('[data-users]').textContent=users;
    old.querySelector('[data-price]').textContent='£'+price;
    old.querySelector('[data-period]').textContent=annual?'/year':'/month';
    const extras=[]; if(users>2)extras.push((users-2)+' extra user'+(users>3?'s':'')); if(ai)extras.push('AI Assistant');
    old.querySelector('[data-breakdown]').textContent='Includes '+users+' user'+(users===1?'':'s')+(extras.length?' · '+extras.join(' · '):'');
  };
  old.querySelector('[data-user-minus]').onclick=()=>{users=Math.max(1,users-1);render()};
  old.querySelector('[data-user-plus]').onclick=()=>{users=Math.min(50,users+1);render()};
  old.querySelector('[data-ai]').onchange=e=>{ai=e.target.checked;render()};
  old.querySelectorAll('[data-billing]').forEach(btn=>btn.onclick=()=>{annual=btn.dataset.billing==='annual';old.querySelectorAll('[data-billing]').forEach(x=>x.classList.toggle('active',x===btn));render()});
  old.querySelector('[data-bms-start]').onclick=()=>{localStorage.setItem('ds-bms-selection',JSON.stringify({users,ai,interval:annual?'annual':'monthly',savedAt:new Date().toISOString()}));};
  render();
}

function buildInstantDemo(){
  if(document.querySelector('#instant-demo'))return;
  const work=document.querySelector('#work'); if(!work)return;
  const section=document.createElement('section'); section.id='instant-demo'; section.className='instantDemo';
  section.innerHTML='<div class="demoIntro"><p class="cap">INSTANT LIVE DEMO</p><h2>See how it could work for your business. Right now.</h2><p>No booking and no sales call. Pick a business like yours, explore the software and click around in seconds.</p></div><div class="demoShell"><div class="demoTop"><label>Viewing example <select data-demo-select>'+demoTypes.map((d,i)=>'<option value="'+i+'">'+d[0]+'</option>').join('')+'</select></label><button type="button" data-tour>Take the 60-second tour</button></div><div class="demoApp"><aside><b>DS</b><span class="active">Dashboard</span><span>Customers</span><span>Jobs</span><span>Quotes</span><span>Invoices</span><span>Payments</span><span>Files</span><span>Team</span></aside><div class="demoContent"><div class="demoHeading"><div><small data-demo-type>PROPERTY MANAGEMENT</small><h3 data-demo-title>Good morning. Here’s what needs attention.</h3><p data-demo-copy></p></div><button>+ New</button></div><div class="demoStats"><article><small>OPEN</small><b>18</b><span>Active items</span></article><article><small>TODAY</small><b>6</b><span>Needs attention</span></article><article><small>OUTSTANDING</small><b>£8,420</b><span>Payments due</span></article></div><div class="demoList"><div><b>Recent activity</b><span>View all</span></div><p><strong>ABC Property Ltd</strong><span>Maintenance visit booked · Today</span></p><p><strong>John Smith</strong><span>Quote ready to send · 12 mins ago</span></p><p><strong>North London Estates</strong><span>Payment received · £1,250</span></p></div><div class="demoAI"><b>AI Assistant</b><p>Try: “Create a new job for ABC Ltd for next Tuesday.”</p><button type="button">🎙 Talk to your business</button></div></div></div><p class="demoFoot">This is a preview of the experience. The full interactive industry demos will use the same software as real customer accounts, with fictional example data.</p></div>';
  work.parentNode.insertBefore(section,work);
  const select=section.querySelector('[data-demo-select]');
  const render=()=>{const d=demoTypes[Number(select.value)];section.querySelector('[data-demo-type]').textContent=d[0].toUpperCase();section.querySelector('[data-demo-copy]').textContent=d[1];const rows=section.querySelectorAll('.demoList p');d.slice(2).forEach((x,i)=>{if(rows[i])rows[i].innerHTML='<strong>'+x[0]+'</strong><span>'+x[1]+' · '+x[2]+'</span>'});};
  select.onchange=render; render();
  section.querySelector('[data-tour]').onclick=()=>{section.classList.toggle('touring');section.querySelector('[data-tour]').textContent=section.classList.contains('touring')?'Exit guided tour':'Take the 60-second tour'};section.querySelectorAll('.demoApp aside span').forEach(tab=>tab.onclick=()=>{section.querySelectorAll('.demoApp aside span').forEach(x=>x.classList.remove('active'));tab.classList.add('active');section.querySelector('[data-demo-title]').textContent=tab.textContent==='Dashboard'?`Good morning. Here’s what needs attention.`:`${tab.textContent} at a glance`;});section.querySelector('.demoAI button').onclick=()=>{section.querySelector('.demoAI p').textContent='Voice AI is coming next. The paid AI Assistant will be enabled only for businesses that add it.';};
}

export default function Refinements(){
  useEffect(()=>{
    document.querySelectorAll('.step article').forEach((card,i)=>{if(!journey[i])return;card.querySelector('h3').textContent=journey[i][0];card.querySelector('p').textContent=journey[i][1]});
    document.querySelector('.testimonialGrid')?.remove();
    const trust=document.querySelector('.wuaBadge'); const frame=trust?.querySelector('iframe');
    if(trust&&frame){trust.classList.add('liveRecommendations');frame.src='https://www.woulduseagain.com/website-widget/diamant-solutions-35c0c36f?layout=horizontal&theme=white&v=20260903-6';frame.title='Diamant Solutions live customer recommendations';frame.setAttribute('width','100%');frame.setAttribute('height','245');frame.setAttribute('scrolling','no')}
    updatePositioning(); buildBusinessPricing(); buildInstantDemo(); addAdvisoryHomepageContent();
  },[]);
  return null;
}
