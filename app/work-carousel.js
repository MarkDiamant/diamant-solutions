'use client';
import {useEffect} from 'react';
import './work-carousel.css';

const sites=[
 {name:'Starlight Decor',url:'https://starlight.preview.diamantsolutions.co.uk'},
 {name:'Certifire UK',url:'https://www.certifireuk.co.uk'},
 {name:'M&J Metal',url:'https://mjmetal.co.uk'},
 {name:'Poll & See',url:'https://www.pollandsee.com'},
 {name:'Luton Circumcision',url:'https://luton.preview.diamantsolutions.co.uk',previewUrl:'https://luton-circumcision.vercel.app'},
 {name:'Sam Certs',url:'https://www.samcerts.co.uk'},
 {name:'Edible Print',url:'https://edibleprint.uk',image:'/Pink Poppy Flowers.avif'},
 {name:'Would Use Again',url:'https://www.woulduseagain.com'}
];

function card(site){
 const a=document.createElement('a');a.href=site.url;a.target='_blank';a.rel='noreferrer';a.className='portfolioFadeCard portfolioPooled';
 const preview=document.createElement('div');preview.className='sitePreview portfolioPreview';
 if(site.image){const img=document.createElement('img');img.src=site.image;img.alt=`${site.name} website preview`;img.className='portfolioScreenshot';preview.appendChild(img)}
 else{const frame=document.createElement('iframe');frame.src=site.previewUrl||site.url;frame.title=site.name;frame.loading='eager';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');preview.appendChild(frame)}
 const label=document.createElement('span');label.innerHTML=`${site.name}<small>VIEW SITE ↗</small>`;a.append(preview,label);return a;
}

export default function WorkCarousel(){
 useEffect(()=>{
  const grid=document.querySelector('.workGrid');if(!grid)return;grid.classList.add('portfolioCarousel','portfolioIndependent');grid.innerHTML='';
  const pool=sites.map(site=>{const el=card(site);grid.appendChild(el);return el});
  const slots=[document.createElement('div'),document.createElement('div')];slots.forEach(slot=>{slot.className='portfolioSlot';grid.appendChild(slot)});
  const place=(el,slot)=>{const r=slot.getBoundingClientRect(),g=grid.getBoundingClientRect();el.style.setProperty('--slot-x',`${r.left-g.left}px`);el.style.setProperty('--slot-y',`${r.top-g.top}px`)};
  const showNow=(el,slot)=>{place(el,slot);el.classList.remove('portfolioPooled','portfolioLeaving','portfolioIncoming');el.classList.add('portfolioVisible')};
  showNow(pool[0],slots[0]);showNow(pool[1],slots[1]);
  const current=[pool[0],pool[1]];
  let next=2,slotIndex=0;
  const change=()=>{
   const slot=slots[slotIndex],old=current[slotIndex],incoming=pool[next];
   place(incoming,slot);
   incoming.classList.remove('portfolioPooled','portfolioLeaving','portfolioVisible');
   incoming.classList.add('portfolioIncoming');
   // Force the transparent start frame to paint before beginning the crossfade.
   void incoming.offsetWidth;
   requestAnimationFrame(()=>{incoming.classList.add('portfolioVisible');incoming.classList.remove('portfolioIncoming');old.classList.add('portfolioLeaving');old.classList.remove('portfolioVisible')});
   setTimeout(()=>{old.classList.remove('portfolioLeaving');old.classList.add('portfolioPooled')},1050);
   current[slotIndex]=incoming;next=(next+1)%sites.length;slotIndex=1-slotIndex;
  };
  const timer=setInterval(change,2800);return()=>clearInterval(timer);
 },[]);return null;
}
