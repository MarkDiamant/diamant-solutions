'use client';
import {useEffect} from 'react';
import './work-carousel.css';

const pairs=[
  [
    {name:'Starlight Decor',url:'https://starlight.preview.diamantsolutions.co.uk'},
    {name:'Certifire UK',url:'https://www.certifireuk.co.uk'}
  ],
  [
    {name:'M&J Metal',url:'https://mjmetal.co.uk'},
    {name:'Poll & See',url:'https://www.pollandsee.com'}
  ],
  [
    {name:'Luton Circumcision',url:'https://luton.preview.diamantsolutions.co.uk'},
    {name:'Sam Certs',url:'https://www.samcerts.co.uk'}
  ],
  [
    {name:'Edible Print',url:'https://www.officialedibleprint.com'},
    {name:'Would Use Again',url:'https://www.woulduseagain.com'}
  ]
];

function card(site){
  const a=document.createElement('a');
  a.href=site.url;a.target='_blank';a.rel='noreferrer';a.className='portfolioFadeCard';
  const preview=document.createElement('div');preview.className='sitePreview portfolioPreview';
  const frame=document.createElement('iframe');frame.src=site.url;frame.title=site.name;frame.loading='eager';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');
  preview.appendChild(frame);
  const label=document.createElement('span');label.innerHTML=`${site.name}<small>VIEW SITE ↗</small>`;
  a.append(preview,label);return {a,frame};
}

export default function WorkCarousel(){
  useEffect(()=>{
    const grid=document.querySelector('.workGrid');
    if(!grid)return;
    grid.classList.add('portfolioCarousel');grid.innerHTML='';
    const layers=pairs.map((pair,i)=>{
      const layer=document.createElement('div');layer.className='portfolioPair'+(i===0?' isVisible':'');
      pair.forEach(site=>{const {a}=card(site);layer.appendChild(a)});
      grid.appendChild(layer);return layer;
    });
    let index=0;
    const timer=setInterval(()=>{
      const old=layers[index];index=(index+1)%layers.length;const next=layers[index];
      next.classList.add('isEntering');
      requestAnimationFrame(()=>requestAnimationFrame(()=>{old.classList.remove('isVisible');next.classList.add('isVisible');next.classList.remove('isEntering')}));
    },6000);
    return()=>clearInterval(timer);
  },[]);
  return null;
}
