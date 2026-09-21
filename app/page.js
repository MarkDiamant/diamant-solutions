'use client';
import Link from 'next/link';
import {useEffect} from 'react';
import './home.css';

function Logo({white=false}){return <img src={white?'/DS Logo with new tagline White.png':'/DS Logo latest tagline.png'} alt="Diamant Solutions" className={white?'dsFooterLogo':'dsLogo'}/>}

function HomeVisual(){return <div className="homeVisual" aria-hidden="true">
  <div className="signal s1"/><div className="signal s2"/><div className="signal s3"/>
  <div className="visualCore"><span>DS</span><small>YOUR BUSINESS</small></div>
  <div className="visualNode software"><b>Business Software</b><small>Run everything in one place</small></div>
  <div className="visualNode websites"><b>Websites</b><small>Look professional online</small></div>
  <div className="visualNode advisory"><b>Business Advisory</b><small>Decide. Act. Move forward.</small></div>
  <svg viewBox="0 0 620 460"><path className="flow f1" d="M310 230 C210 215 170 130 104 108"/><path className="flow f2" d="M310 230 C425 210 465 125 526 105"/><path className="flow f3" d="M310 230 C315 330 410 360 475 380"/></svg>
</div>}

const services=[
 {key:'software',label:'BUSINESS MANAGEMENT SOFTWARE',title:'Run your business in one place.',copy:'Customers, jobs, quotes, invoices, payments, staff, files and more. Simple software set up around the way your business actually works.',href:'/software',cta:'Explore Business Software',bits:['Set up for your business','Managed & supported','From £49/month']},
 {key:'websites',label:'PROFESSIONAL WEBSITES',title:'A website that does your business justice.',copy:'A modern, professional website designed and built for you, with hosting, support and reasonable ongoing changes included.',href:'/websites',cta:'Explore Websites',bits:['Designed & built for you','Hosting included','From £29/month']},
 {key:'advisory',label:'BUSINESS ADVISORY',title:'Turn decisions into action.',copy:'Practical one-to-one support for business owners who need clarity, accountability and help getting important things implemented.',href:'/advisory',cta:'Explore Business Advisory',bits:['Practical decisions','Clear next actions','Accountability']}
];

export default function Home(){
 useEffect(()=>{const els=[...document.querySelectorAll('.homeReveal')];const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});els.forEach(e=>io.observe(e));return()=>io.disconnect()},[]);
 return <main className="dsHome">
  <header className="dsHeader"><Link href="/" className="logoLink"><Logo/></Link><nav><Link href="/software">BUSINESS SOFTWARE</Link><Link href="/websites">WEBSITES</Link><Link href="/advisory">BUSINESS ADVISORY</Link><Link href="/#about">ABOUT</Link><Link href="/#contact">CONTACT</Link></nav><details className="homeMobile"><summary aria-label="Open menu"><i/><i/><i/></summary><div><Link href="/software">Business Software</Link><Link href="/websites">Websites</Link><Link href="/advisory">Business Advisory</Link><Link href="/#about">About</Link><Link href="/#contact">Contact</Link></div></details></header>
  <section className="homeHero"><div className="heroGrid"/><div className="homeHeroCopy homeReveal"><p className="eyebrow">DIAMANT SOLUTIONS</p><h1>Practical solutions<br/><span>built around your business.</span></h1><p>Business management software, professional websites and practical business advisory. Choose what you need and we’ll take care of the rest.</p><div className="heroActions"><a href="#services" className="primary">See What We Do</a><a href="#contact" className="secondary">Talk to Us</a></div></div><div className="homeReveal visualReveal"><HomeVisual/></div></section>
  <section id="services" className="serviceIntro homeReveal"><p className="eyebrow">WHAT WE DO</p><h2>Three ways we help businesses move forward.</h2><p>Each service has one purpose: make running and growing your business simpler.</p></section>
  <section className="serviceCards">{services.map((s,i)=><Link href={s.href} key={s.key} className={'serviceCard '+s.key+' homeReveal'} style={{transitionDelay:(i*90)+'ms'}}><div className="serviceIcon"><span/><span/><span/></div><p className="eyebrow">{s.label}</p><h3>{s.title}</h3><p className="serviceCopy">{s.copy}</p><div className="serviceBits">{s.bits.map(x=><span key={x}>{x}</span>)}</div><b className="serviceCta">{s.cta} <i>→</i></b></Link>)}</section>
  <section className="homePromise"><div className="homeReveal"><p className="eyebrow">ONE APPROACH</p><h2>Clear. Practical. Managed for you.</h2></div><div className="promiseGrid homeReveal"><article><b>01</b><h3>We understand what you need.</h3><p>No unnecessary complexity. We start with the actual problem you want solved.</p></article><article><b>02</b><h3>We build or configure it.</h3><p>You do not need to become a software, website or systems expert.</p></article><article><b>03</b><h3>We stay involved.</h3><p>Support does not disappear the moment something goes live.</p></article></div></section>
  <section id="about" className="homeAbout"><div className="homeReveal"><p className="eyebrow">ABOUT DIAMANT SOLUTIONS</p><h2>Built for businesses that want things to work.</h2></div><div className="homeReveal"><p>We build and manage practical digital solutions around real businesses, rather than forcing businesses into a fixed template. That can mean software that follows the way your team works, a professional website that is looked after for you, or direct support making and implementing important business decisions.</p><a href="#services">Explore our services →</a></div></section>
  <section id="contact" className="homeContact"><div className="homeReveal"><p className="eyebrow">NOT SURE WHERE TO START?</p><h2>Tell us what you’re trying to achieve.</h2><p>We’ll help you work out which service makes sense, without making it more complicated than it needs to be.</p></div><div className="contactActions homeReveal"><a className="contactPrimary" href="mailto:info@diamantsolutions.co.uk">Email us</a><a href="https://wa.me/442032845074">WhatsApp / call 0203 284 5074</a></div></section>
  <footer className="dsFooter"><Logo white/><div><b>Diamant Solutions Ltd</b><br/>Business software, professional websites and practical business advisory.</div><div><b>Explore</b><br/><Link href="/software">Business Software</Link><br/><Link href="/websites">Websites</Link><br/><Link href="/advisory">Business Advisory</Link></div><div><b>Contact</b><br/>info@diamantsolutions.co.uk<br/>0203 284 5074<br/><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></div></footer>
 </main>
}