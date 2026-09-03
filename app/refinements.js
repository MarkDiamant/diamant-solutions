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

export default function Refinements(){
  useEffect(()=>{
    document.querySelectorAll('.step article').forEach((card,i)=>{
      if(!journey[i]) return;
      const h=card.querySelector('h3');
      const p=card.querySelector('p');
      if(h) h.textContent=journey[i][0];
      if(p) p.textContent=journey[i][1];
    });
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
  },[]);
  return null;
}