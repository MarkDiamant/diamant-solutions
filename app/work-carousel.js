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
    {name:'Edible Print',url:'https://edibleprint.uk',image:'/Pink Poppy Flowers.avif'},
    {name:'Would Use Again',url:'https://www.woulduseagain.com'}
  ]
];

function card(site){
  const a=document.createElement('a');
  a.href=site.url;a.target='_blank';a.rel='noreferrer';a.className='portfolioFadeCard';
  const preview=document.createElement('div');preview.className='sitePreview portfolioPreview';
  if(site.image){
    const img=document.createElement('img');img.src=site.image;img.alt=`${site.name} website preview`;img.className='portfolioScreenshot';preview.appendChild(img);
  }else{
    const frame=document.createElement('iframe');frame.src=site.url;frame.title=site.name;frame.loading='eager';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');preview.appendChild(frame);
  }
  const label=document.createElement('span');label.innerHTML=`${site.name}<small>VIEW SITE ↗</small>`;
  a.append(preview,label);return a;
}

export default function WorkCarousel(){
  useEffect(()=>{
    const grid=document.querySelector('.workGrid');
    if(!grid)return;
    grid.classList.add('portfolioCarousel');grid.innerHTML='';
    const layers=pairs.map((pair,i)=>{
      const layer=document.createElement('div');layer.className='portfolioPair'+(i===0?' isVisible':'');
      pair.forEach(site=>layer.appendChild(card(site)));
      grid.appendChild(layer);return layer;
    });
    let index=0;
    const timer=setInterval(()=>{
      const old=layers[index];index=(index+1)%layers.length;const next=layers[index];
      next.classList.add('isEntering');
      requestAnimationFrame(()=>requestAnimationFrame(()=>{old.classList.remove('isVisible');next.classList.add('isVisible');next.classList.remove('isEntering')}));
    },8000);
    return()=>clearInterval(timer);
  },[]);
  return null;
}
