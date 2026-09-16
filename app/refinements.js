'use client';
import {useEffect} from 'react';

const journey=[
  ['Tell Us About Your Business','Send us a quick message or have a short call about what you need.'],
  ['Sign Up','Choose monthly or annual and start your website or CRM subscription.'],
  ['Design & Build','We design and build your website or CRM around your business.'],
  ['Review','You review the first draft and we make the agreed changes.'],
  ['Launch','Your new website or CRM goes live.'],
  ['We Keep It Managed','Hosting, minor changes and ongoing support are included.']
];

const crmLinks={
  oneTwo:{monthly:'https://buy.stripe.com/fZudRac9zd5z7erag61Nu09',annual:'https://buy.stripe.com/5kQeVea1r5D7fKXbka1Nu0a',oneOff:'https://buy.stripe.com/5kQbJ2ddD1mR7er5ZQ1Nu0i'},
  threeFive:{monthly:'https://buy.stripe.com/bJeeVe5Lb6Hb9mz5ZQ1Nu0c',annual:'https://buy.stripe.com/3cI3cw2yZc1vgP15ZQ1Nu0d',oneOff:'https://buy.stripe.com/3cI5kE2yZghLdCP1JA1Nu0j'},
  sixTen:{monthly:'https://buy.stripe.com/cNibJ2a1r8Pj9mz87Y1Nu0f',annual:'https://buy.stripe.com/bJeeVeehH4z3eGT3RI1Nu0g',oneOff:'https://buy.stripe.com/cNi7sM7Tj5D756j9c21Nu0k'}
};

function addAdvisoryHomepageContent(){
  if(window.location.pathname!=='/')return;

  document.querySelectorAll('header nav').forEach(nav=>{
    if(nav.querySelector('[data-advisory-nav]'))return;
    const link=document.createElement('a');
    link.href='/advisory';
    link.textContent='BUSINESS ADVISORY';
    link.dataset.advisoryNav='true';
    const about=[...nav.querySelectorAll('a')].find(a=>a.getAttribute('href')==='#about');
    nav.insertBefore(link,about||null);
  });

  const mobile=document.querySelector('.mobileMenu div');
  if(mobile&&!mobile.querySelector('[data-advisory-nav]')){
    const link=document.createElement('a');
    link.href='/advisory';
    link.textContent='BUSINESS ADVISORY';
    link.dataset.advisoryNav='true';
    const about=[...mobile.querySelectorAll('a')].find(a=>a.getAttribute('href')==='#about');
    mobile.insertBefore(link,about||null);
  }

  if(!document.querySelector('.homeAdvisory')){
    const contact=document.querySelector('.contact');
    if(contact){
      const section=document.createElement('section');
      section.className='homeAdvisory';
      section.innerHTML=`
        <div class="homeAdvisoryGlow one"></div>
        <div class="homeAdvisoryGlow two"></div>
        <div class="homeAdvisoryInner reveal">
          <div class="homeAdvisoryCopy">
            <p class="cap">WE ALSO DO BUSINESS ADVISORY</p>
            <h2>Practical support to turn plans into action.</h2>
            <p>One-to-one support for business owners who need clarity, accountability and practical help implementing the things they already know need to get done.</p>
            <a class="homeAdvisoryBtn" href="/advisory">Explore Business Advisory</a>
          </div>
          <div class="homeAdvisoryGrid">
            ${['Business direction and decision-making','Priorities and implementation','Pricing and profitability','Systems and processes','Accountability and follow-through'].map(item=>`<div class="homeAdvisoryItem"><span>${item}</span></div>`).join('')}
          </div>
        </div>`;
      contact.parentNode.insertBefore(section,contact);
      requestAnimationFrame(()=>section.querySelector('.reveal')?.classList.add('in'));
    }
  }

  const footer=document.querySelector('footer');
  if(footer&&!footer.classList.contains('homeUnifiedFooter')){
    footer.classList.add('homeUnifiedFooter');
    footer.innerHTML=`
      <img src="/DS Logo with new tagline White.png" alt="Diamant Solutions" class="footerOfficialLogo"/>
      <div><b>Diamant Solutions Ltd</b><br/>Professional websites, custom CRM systems and practical business advisory.</div>
      <div><b>Explore</b><br/><a href="/#pricing">Websites & CRM</a><br/><a href="/advisory">Business Advisory</a></div>
      <div><b>Contact</b><br/>info@diamantsolutions.co.uk<br/>0203 284 5074<br/><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></div>`;
  }
}

function refinePricing(){
  document.querySelectorAll('.whyList p b').forEach(n=>n.remove());

  const pricing=document.querySelector('.pricing');
  if(!pricing)return;

  const bespokeBlocks=[...pricing.querySelectorAll('.bespoke')];
  const websiteBlock=bespokeBlocks[0];
  if(websiteBlock){
    const heading=websiteBlock.querySelector('h3');
    if(heading)heading.textContent='Prefer to own your website outright?';
    if(!websiteBlock.querySelector('[data-complex-website]')){
      const divider=document.createElement('div');
      divider.className='bespokeDivider';
      divider.dataset.complexWebsite='true';
      divider.innerHTML=`<h3>Need a more complex website?</h3><p>For e-commerce, booking systems, advanced integrations, custom functionality or larger projects, get in touch for a tailored quote.</p><a class="bespokeBtn" href="#contact">Get a tailored quote</a>`;
      websiteBlock.appendChild(divider);
    }
  }

  const cards=[...pricing.querySelectorAll('.crmCards article')];
  const plans=[
    {links:crmLinks.oneTwo,items:['Custom CRM built around your agreed workflow','Up to 2 staff logins & permissions','Customer, enquiry, task and workflow management']},
    {links:crmLinks.threeFive,items:['Everything in the 1-2 user plan','Built for growing teams','Up to 5 staff logins & permissions']},
    {links:crmLinks.sixTen,items:['Everything in the 3-5 user plan','Built for larger teams and workflows','Up to 10 staff logins & permissions']}
  ];
  cards.forEach((card,i)=>{
    const plan=plans[i];
    if(!plan)return;
    const ul=card.querySelector('ul');
    if(ul)ul.innerHTML=plan.items.map(x=>`<li>${x}</li>`).join('');
    card.querySelectorAll(':scope > .blueBtn').forEach(a=>a.remove());
    if(!card.querySelector('.crmButtonRow')){
      const row=document.createElement('div');
      row.className='crmButtonRow';
      row.innerHTML=`<a class="blueBtn" href="${plan.links.monthly}">Get Started Monthly</a><a class="blueBtn crmAnnualBtn" href="${plan.links.annual}">Get Started Annually</a>`;
      card.appendChild(row);
    }
  });

  const oneOffs=[...pricing.querySelectorAll('.crmOneOffPrices > div')];
  [crmLinks.oneTwo.oneOff,crmLinks.threeFive.oneOff,crmLinks.sixTen.oneOff].forEach((url,i)=>{
    const box=oneOffs[i];
    if(box&&!box.querySelector('.crmOneOffBtn')){
      const a=document.createElement('a');
      a.className='crmOneOffBtn';
      a.href=url;
      a.textContent='Get Started';
      box.appendChild(a);
    }
  });
}

export default function Refinements(){
  useEffect(()=>{
    document.querySelectorAll('.step article').forEach((card,i)=>{
      if(!journey[i])return;
      const h=card.querySelector('h3');
      const p=card.querySelector('p');
      if(h)h.textContent=journey[i][0];
      if(p)p.textContent=journey[i][1];
    });

    document.querySelector('.testimonialGrid')?.remove();

    const trust=document.querySelector('.wuaBadge');
    const frame=trust?.querySelector('iframe');
    if(trust&&frame){
      trust.classList.add('liveRecommendations');
      frame.src='https://www.woulduseagain.com/website-widget/diamant-solutions-35c0c36f?layout=horizontal&theme=white&v=20260903-6';
      frame.title='Diamant Solutions live customer recommendations';
      frame.setAttribute('width','100%');
      frame.setAttribute('height','245');
      frame.setAttribute('scrolling','no');
    }

    refinePricing();
    addAdvisoryHomepageContent();
  },[]);
  return null;
}
