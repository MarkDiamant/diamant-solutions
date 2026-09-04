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
    {name:'Luton Circumcision',url:'https://luton-circumcision.vercel.app'},
    {name:'Sam Certs',url:'https://www.samcerts.co.uk'}
  ],
  [
    {name:'Edible Print',url:'https://edibleprint.uk'},
    {name:'Would Use Again',url:'https://www.woulduseagain.com'}
  ]
];

function card(site){
  const a=document.createElement('a');
  a.href=site.url;a.target='_blank';a.rel='noreferrer';a.className='portfolioFadeCard';
  const preview=document.createElement('div');preview.className='sitePreview portfolioPreview';
  const frame=document.createElement('iframe');frame.src=site.url;frame.title=site.name;frame.loading='lazy';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');
  preview.appendChild(frame);
  const label=document.createElement('span');label.innerHTML=`${site.name}<small>VIEW SITE ↗</small>`;
  a.append(preview,label);return a;
}

export default function WorkCarousel(){
  useEffect(()=>{
    const grid=document.querySelector('.workGrid');
    if(!grid)return;
    grid.classList.add('portfolioCarousel');
    grid.innerHTML='';
    let index=0;
    const render=(nextIndex,first=false)=>{
      const layer=document.createElement('div');layer.className='portfolioPair'+(first?' isVisible':'');
      pairs[nextIndex].forEach(site=>layer.appendChild(card(site)));
      grid.appendChild(layer);
      requestAnimationFrame(()=>requestAnimationFrame(()=>layer.classList.add('isVisible')));
      const old=[...grid.querySelectorAll('.portfolioPair')].filter(el=>el!==layer);
      old.forEach(el=>{el.classList.remove('isVisible');setTimeout(()=>el.remove(),850)});
    };
    render(0,true);
    const timer=setInterval(()=>{index=(index+1)%pairs.length;render(index)},5200);
    return()=>clearInterval(timer);
  },[]);
  return null;
}
