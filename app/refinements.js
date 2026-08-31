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
  },[]);
  return null;
}
