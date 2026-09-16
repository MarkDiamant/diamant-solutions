'use client';
import {useEffect} from 'react';

const journey=[
  ['Tell Us About Your Business','Send us a quick message or have a short call about what you need.'],
  ['Sign Up','Choose monthly or annual and start your website subscription.'],
  ['Design & Build','We design and build your website around your business.'],
  ['Review','You review the first draft and we make the agreed changes.'],
  ['Launch','Your new website goes live.'],
  ['We Keep It Managed','Hosting, minor changes and ongoing support are included.']
];

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
    const pricing=document.querySelector('.pricing');
    const testimonials=document.querySelector('.testimonials');
    if(pricing&&testimonials){
      const section=document.createElement('section');
      section.className='homeAdvisory';
      section.innerHTML=`
        <div class="homeAdvisoryGlow one"></div>
        <div class="homeAdvisoryGlow two"></div>
        <div class="homeAdvisoryInner reveal">
          <div class="homeAdvisoryCopy">
            <p class="cap">BUSINESS ADVISORY</p>
            <h2>Practical support to turn plans into action.</h2>
            <p>One-to-one support for business owners who need clarity, accountability and practical help implementing the things they already know need to get done.</p>
            <a class="homeAdvisoryBtn" href="/advisory">Explore Business Advisory</a>
          </div>
          <div class="homeAdvisoryGrid">
            ${['Business direction and decision-making','Priorities and implementation','Pricing and profitability','Systems and processes','Accountability and follow-through'].map(item=>`<div class="homeAdvisoryItem"><span>${item}</span></div>`).join('')}
          </div>
        </div>`;
      testimonials.parentNode.insertBefore(section,testimonials);
      requestAnimationFrame(()=>section.querySelector('.reveal')?.classList.add('in'));
    }
  }

  document.querySelectorAll('[data-advisory-footer]').forEach(el=>el.remove());
  const footer=document.querySelector('footer');
  const footerLast=footer?.querySelector(':scope > div:last-of-type');
  if(footerLast&&!footerLast.querySelector('[data-footer-explore]')){
    const explore=document.createElement('div');
    explore.dataset.footerExplore='true';
    explore.className='footerExploreLinks';
    explore.innerHTML='<b>Explore</b><br/><a href="/">Websites</a><br/><a href="/advisory">Business Advisory</a><br/><br/>';
    footerLast.prepend(explore);
  }
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

    addAdvisoryHomepageContent();
  },[]);
  return null;
}