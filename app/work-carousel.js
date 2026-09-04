'use client';
import {useEffect} from 'react';
import './work-carousel.css';

const sites=[
 {name:'Starlight Decor',url:'https://starlight.preview.diamantsolutions.co.uk'},
 {name:'Certifire UK',url:'https://www.certifireuk.co.uk'},
 {name:'M&J Metal',url:'https://mjmetal.co.uk'},
 {name:'Poll & See',url:'https://www.pollandsee.com'},
 {name:'Luton Circumcision',url:'https://luton.preview.diamantsolutions.co.uk',image:'https://www.expertcirc.co.uk/wp-content/uploads/2016/10/1.png'},
 {name:'Sam Certs',url:'https://www.samcerts.co.uk'},
 {name:'Edible Print',url:'https://edibleprint.uk',image:'/Pink Poppy Flowers.avif'},
 {name:'Would Use Again',url:'https://www.woulduseagain.com'}
];

function card(site){
 const a=document.createElement('a');a.href=site.url;a.target='_blank';a.rel='noreferrer';a.className='portfolioFadeCard';
 const preview=document.createElement('div');preview.className='sitePreview portfolioPreview';
 if(site.image){const img=document.createElement('img');img.src=site.image;img.alt=`${site.name} website preview`;img.className='portfolioScreenshot';preview.appendChild(img)}
 else{const frame=document.createElement('iframe');frame.src=site.url;frame.title=site.name;frame.loading='eager';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');preview.appendChild(frame)}
 const label=document.createElement('span');label.innerHTML=`${site.name}<small>VIEW SITE ↗</small>`;a.append(preview,label);return a;
}

export default function WorkCarousel(){
 useEffect(()=>{
  const grid=document.querySelector('.workGrid');if(!grid)return;grid.classList.add('portfolioCarousel','portfolioIndependent');grid.innerHTML='';
  const slots=[document.createElement('div'),document.createElement('div')];slots.forEach((slot,i)=>{slot.className='portfolioSlot';slot.appendChild(card(sites[i]));grid.appendChild(slot)});
  let next=2,slotIndex=0;
  const change=()=>{const slot=slots[slotIndex];const old=slot.firstElementChild;const incoming=card(sites[next]);incoming.classList.add('portfolioIncoming');slot.appendChild(incoming);requestAnimationFrame(()=>requestAnimationFrame(()=>{old?.classList.add('portfolioLeaving');incoming.classList.remove('portfolioIncoming');setTimeout(()=>old?.remove(),1100)}));next=(next+1)%sites.length;slotIndex=1-slotIndex};
  const timer=setInterval(change,2200);return()=>clearInterval(timer);
 },[]);return null;
}
