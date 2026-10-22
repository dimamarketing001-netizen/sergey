import './styles.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
gsap.registerPlugin(ScrollTrigger);

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
document.body.classList.add('is-loading');

function splitLetters(el, cls='split-char'){
  if(!el||el.dataset.ready)return[];
  el.dataset.ready='1';
  const text=el.textContent.trim();
  el.setAttribute('aria-label',text);
  const out=[...text].map(ch=>{
    const s=document.createElement('span');
    s.className=cls;
    s.setAttribute('aria-hidden','true');
    s.innerHTML=ch===' '?'&nbsp;':ch;
    return s;
  });
  el.replaceChildren(...out);
  return out;
}

const OUTLINE_FONT="300 100px Montserrat";
let outlineCtx;

/* Контурные буквы: каждая буква — отдельный inline-SVG с <text>.
   Шрифт Montserrat Light подключён без перекрывающихся контуров,
   поэтому обводка получается ровной и без внутренних линий (особенно в «А», «К», «Д»).
   Размеры в em — контур масштабируется вместе с font-size. */
function outlineLetters(el, cls='split-char'){
  if(!el||el.dataset.ready)return[];
  el.dataset.ready='1';
  const text=el.textContent.trim();
  el.setAttribute('aria-label',text);
  outlineCtx=outlineCtx||document.createElement('canvas').getContext('2d');
  outlineCtx.font=OUTLINE_FONT;
  const ns='http://www.w3.org/2000/svg',pad=.06,asc=1.02,desc=.28,gap=.035;
  let total=0;
  const out=[...text].map(ch=>{
    const adv=outlineCtx.measureText(ch).width/100;
    const w=adv+pad*2;
    total+=w+gap-pad*2;
    const svg=document.createElementNS(ns,'svg');
    svg.setAttribute('class',cls+' outline-char');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');
    svg.style.width=w+'em';
    svg.style.height=(asc+desc)+'em';
    svg.style.marginInline=(-pad)+'em '+(gap-pad)+'em';
    if(ch.trim()){
      const t=document.createElementNS(ns,'text');
      t.setAttribute('x',pad+'em');
      t.setAttribute('y',asc+'em');
      t.textContent=ch;
      svg.append(t);
    }
    return svg;
  });
  el.replaceChildren(...out);
  el.classList.add('is-outlined');
  el.parentElement.style.setProperty('--word-em',total.toFixed(3));
  return out;
}

const splitAny=(el,cls)=>el.hasAttribute('data-outline')?outlineLetters(el,cls):splitLetters(el,cls);

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finePointer=matchMedia('(hover:hover) and (pointer:fine)').matches;
let lenis=null;
let busyDates=new Set();

async function loadContent(){
  try{
    const r=await fetch('/data/content.json',{cache:'no-cache'});
    return r.ok?await r.json():{};
  }catch{return {}}
}

/* ---------- Контент из /data/content.json: площадки, отзывы, занятые даты ---------- */
function renderVenues(list){
  if(!Array.isArray(list)||!list.length)return;
  const after=$('.ticker--lime');
  if(!after)return;
  const star='<svg class="ico ico--star" aria-hidden="true" focusable="false"><use href="#i-star"/></svg>';
  const row=list.map(esc).join(star)+star;
  const sec=document.createElement('section');
  sec.className='ticker ticker--dark';
  sec.setAttribute('aria-label','Где проходили мероприятия');
  sec.innerHTML=`<div class="ticker__track"><span>${row}</span><span aria-hidden="true">${row}</span></div>`;
  after.after(sec);
}

const REVIEW_TABS=[['all','Все'],['wedding','Свадьбы'],['corporate','Корпоративы'],['graduation','Выпускные'],['jubilee','Юбилеи']];

function renderReviews(list){
  const box=$('[data-reviews]');
  if(!box||!Array.isArray(list)||!list.length)return;
  const tabs=REVIEW_TABS.filter(([k])=>k==='all'||list.some(r=>r.type===k));
  box.innerHTML=`
    <div class="section-kicker"><span>05</span><span>отзывы</span><span>говорят заказчики</span></div>
    <div class="reviews__head">
      <h2 class="mega-title">ПОСЛЕ<br>ВЕЧЕРА<br><em>ПИШУТ.</em></h2>
      <div class="reviews__tabs" role="tablist" aria-label="Тип мероприятия">${tabs.map(([k,l],i)=>`<button type="button" role="tab" data-tab="${k}" aria-selected="${i===0}">${l}</button>`).join('')}</div>
    </div>
    <div class="reviews__grid" data-review-grid></div>
    <button class="reviews__more" type="button" data-review-more hidden>Показать ещё</button>`;
  box.hidden=false;
  const grid=$('[data-review-grid]',box),more=$('[data-review-more]',box);
  const LIMIT=6;
  let tab='all',expanded=false;
  const draw=()=>{
    const items=list.filter(r=>tab==='all'||r.type===tab);
    const shown=tab==='all'&&!expanded?items.slice(0,LIMIT):items;
    grid.innerHTML=shown.map((r,i)=>`
      <figure class="review" style="--i:${i}">
        <span class="review__mark" aria-hidden="true">“</span>
        <blockquote>${esc(r.text)}</blockquote>
        <figcaption><i aria-hidden="true">${esc([...String(r.name)][0]||'')}</i><span><b>${esc(r.name)}</b><small>${esc(r.meta)}</small></span></figcaption>
      </figure>`).join('');
    more.hidden=!(tab==='all'&&!expanded&&items.length>LIMIT);
    if(!reduced)gsap.from($$('.review',grid),{y:30,opacity:0,duration:.6,stagger:.06,ease:'power3.out'});
    ScrollTrigger.refresh();
  };
  $$('[data-tab]',box).forEach(b=>b.addEventListener('click',()=>{
    tab=b.dataset.tab;expanded=false;
    $$('[data-tab]',box).forEach(x=>x.setAttribute('aria-selected',String(x===b)));
    draw();
  }));
  more.addEventListener('click',()=>{expanded=true;draw();});
  draw();
}

function dateGuard(list){
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  // сегодня и ближайшие три дня считаются занятыми всегда
  const rolling=[0,1,2,3].map(n=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d)});
  busyDates=new Set([...(Array.isArray(list)?list:[]).map(String),...rolling]);
  const input=$('#leadForm input[name="date"]');
  const hint=$('#dateHint');
  if(!input)return;
  const today=new Date();
  input.min=iso(today);
  if(!hint||!busyDates.size)return;
  input.addEventListener('change',()=>{
    const busy=busyDates.has(input.value);
    hint.hidden=!busy;
    hint.textContent=busy?'На эту дату мой календарь занят — оставьте заявку, обсудим другие варианты.':'';
  });
}

/* ---------- FAQ ---------- */
function faq(){
  $$('[data-faq] .faq-item__q').forEach(btn=>btn.addEventListener('click',()=>{
    const item=btn.closest('.faq-item');
    const open=item.classList.toggle('is-open');
    btn.setAttribute('aria-expanded',String(open));
    sound.tick(open?640:420);
  }));
}

/* ---------- Быстрая связь (VK / звонок) ---------- */
function quickContact(){
  const box=$('[data-quick]');
  if(!box)return;
  const hideOn=new Set();
  const update=()=>box.classList.toggle('is-visible',scrollY>innerHeight*.7&&!hideOn.size);
  addEventListener('scroll',update,{passive:true});
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(es=>{
      es.forEach(e=>e.isIntersecting?hideOn.add(e.target):hideOn.delete(e.target));
      update();
    },{threshold:.15});
    ['#lead','.footer'].forEach(sel=>{const el=$(sel);if(el)io.observe(el)});
  }
  update();
}

/* ---------- Превью видео в карточках ---------- */
function reelPreviews(){
  const save=navigator.connection&&navigator.connection.saveData;
  if(reduced||save||!('IntersectionObserver' in window))return;
  const io=new IntersectionObserver(entries=>entries.forEach(en=>{
    const v=en.target;
    if(en.isIntersecting){
      if(!v.src)v.src=v.dataset.src;
      v.play().then(()=>v.classList.add('is-playing')).catch(()=>{});
    }else v.pause();
  }),{threshold:.5});
  $$('.reel-card__preview').forEach(v=>io.observe(v));
}

/* ---------- 3D-наклон карточек ---------- */
function tilt(){
  if(reduced||!finePointer)return;
  $$('.reel-card').forEach(card=>{
    card.addEventListener('pointermove',e=>{
      const r=card.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      card.style.setProperty('--rx',`${(-y*7).toFixed(2)}deg`);
      card.style.setProperty('--ry',`${(x*9).toFixed(2)}deg`);
    });
    card.addEventListener('pointerleave',()=>{
      card.style.setProperty('--rx','0deg');
      card.style.setProperty('--ry','0deg');
    });
  });
}

/* ---------- Звук: спокойная праздничная музыка на фоне + «искристые» клики ---------- */
const sound=(()=>{
  let ctx=null,on=true,master=null,music=null,fx=null,verb=null,timer=0,nextT=0,stepN=0,unlocked=false;
  try{on=localStorage.getItem('sound')!=='0'}catch{}
  const btns=()=>$$('[data-sound]');
  const paint=()=>btns().forEach(b=>{
    b.setAttribute('aria-pressed',String(on));
    b.classList.toggle('is-on',on);
    if(b.classList.contains('sound-fab'))b.setAttribute('aria-label',on?'Выключить звук':'Включить звук');
    else b.textContent=`звук: ${on?'вкл':'выкл'}`;
  });
  const hz=n=>440*2**((n-69)/12);
  /* Cmaj9 – Am9 – Fmaj9 – Gadd9: светлая, мягкая, «праздничная» последовательность */
  const CH=[[48,64,67,71,74],[45,64,67,72,76],[41,60,64,69,72],[43,62,66,71,74]].map(c=>c);
  const ARP=[[0,1,2,3,4,3,2,1],[1,2,3,4,3,2,3,1]];
  const build=()=>{
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
    /* простая «комната»: затухающий стереошум */
    const len=ctx.sampleRate*2.6,ir=ctx.createBuffer(2,len,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len)**2.4}
    verb=ctx.createConvolver();verb.buffer=ir;
    const vg=ctx.createGain();vg.gain.value=.55;verb.connect(vg).connect(master);
    music=ctx.createGain();music.gain.value=.9;music.connect(master);music.connect(verb);
    fx=ctx.createGain();fx.gain.value=1;fx.connect(master);
    const send=ctx.createGain();send.gain.value=.5;fx.connect(send).connect(verb);
    /* лёгкое эхо для искры */
    const dl=ctx.createDelay(1);dl.delayTime.value=.375;const fb=ctx.createGain();fb.gain.value=.32;
    const dg=ctx.createGain();dg.gain.value=.5;music.connect(dl);dl.connect(fb).connect(dl);dl.connect(dg).connect(master);
  };
  const bell=(dest,f,t,vol,dec=1.6)=>{
    const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(vol,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dec);
    g.connect(dest);
    [[1,1],[2,.28],[4.1,.08]].forEach(([r,a])=>{
      const o=ctx.createOscillator(),og=ctx.createGain();
      o.type='sine';o.frequency.value=f*r;og.gain.value=a;
      o.connect(og).connect(g);o.start(t);o.stop(t+dec+.05);
    });
  };
  const padChord=(notes,t,dur)=>{
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1100;lp.Q.value=.3;
    const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);
    g.gain.linearRampToValueAtTime(.05,t+1.6);g.gain.setValueAtTime(.05,t+dur-.4);g.gain.linearRampToValueAtTime(.0001,t+dur+1.8);
    lp.connect(g).connect(music);
    notes.forEach((n,i)=>{
      const o=ctx.createOscillator(),og=ctx.createGain();
      o.type=i===0?'sine':'triangle';o.frequency.value=hz(n);o.detune.value=(i%2?5:-5);
      og.gain.value=i===0?1.1:.55;o.connect(og).connect(lp);o.start(t);o.stop(t+dur+2);
    });
  };
  const BPM=78,STEP=60/BPM/2;
  const schedule=(n,t)=>{
    const ci=Math.floor(n/16)%CH.length,s=n%16,ch=CH[ci];
    if(s===0)padChord(ch,t,STEP*16);
    if(s%8===0)bell(music,hz(ch[0]+12),t,.05,2.4);              // мягкий «колокольный» бас
    if(s%2===0||Math.random()<.25){
      const pat=ARP[Math.floor(n/16)%2],idx=pat[(s>>0)%8];
      if(Math.random()<.78){
        const note=ch[1+idx%4]+12;
        bell(music,hz(note),t,.045+Math.random()*.012,1.5);
        if(s%8===4&&Math.random()<.5)bell(music,hz(note+12),t+STEP*.5,.022,1);
      }
    }
  };
  const pump=()=>{
    while(nextT<ctx.currentTime+.5){schedule(stepN,nextT);nextT+=STEP;stepN++}
  };
  const startMusic=()=>{
    if(timer||!ctx)return;
    nextT=ctx.currentTime+.15;
    pump();timer=setInterval(pump,150);
  };
  const stopMusic=()=>{clearInterval(timer);timer=0};
  const setOn=v=>{
    on=v;
    if(!ctx)return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(on?1:0,ctx.currentTime,on?.8:.15);
    if(on){startMusic()}else setTimeout(()=>{if(!on)stopMusic()},600);
  };
  const ensure=()=>{
    if(!ctx)build();
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  };
  const unlock=()=>{
    if(unlocked)return;unlocked=true;
    ['pointerdown','touchend','keydown','click'].forEach(e=>window.removeEventListener(e,unlock,true));
    if(!on)return;
    try{ensure();setOn(true)}catch{}
  };
  document.addEventListener('visibilitychange',()=>{
    if(!ctx||!on)return;
    if(document.hidden)ctx.suspend().catch(()=>{});else ctx.resume().catch(()=>{});
  });
  return{
    get on(){return on},
    init(){
      paint();
      ['pointerdown','touchend','keydown','click'].forEach(e=>window.addEventListener(e,unlock,{capture:true,passive:true}));
      btns().forEach(b=>b.addEventListener('click',e=>{
        e.stopPropagation();
        try{ensure();unlocked=true;setOn(!on)}catch{on=!on}
        try{localStorage.setItem('sound',on?'1':'0')}catch{}
        paint();
        if(on)setTimeout(()=>this.tick(880),60);
      }));
    },
    /* клик/наведение: искристый «звоночек» с коротким взлётом */
    tick(freq=520,vol=.05,len=.14){
      if(!on||!ctx||!unlocked||ctx.state!=='running')return;
      try{
        const t=ctx.currentTime;
        if(vol<.03){bell(fx,freq*1.5,t,.05,.5);return}
        bell(fx,freq,t,.16,1.1);
        bell(fx,freq*1.5,t+.055,.1,.9);
        bell(fx,freq*2,t+.11,.08,.8);
        const nb=ctx.createBuffer(1,ctx.sampleRate*.18,ctx.sampleRate),d=nb.getChannelData(0);
        for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
        const ns=ctx.createBufferSource(),bp=ctx.createBiquadFilter(),ng=ctx.createGain();
        ns.buffer=nb;bp.type='bandpass';bp.Q.value=1.2;
        bp.frequency.setValueAtTime(1800,t);bp.frequency.exponentialRampToValueAtTime(7000,t+.16);
        ng.gain.setValueAtTime(.05,t);ng.gain.exponentialRampToValueAtTime(.0001,t+.17);
        ns.connect(bp).connect(ng).connect(fx);ns.start(t);
      }catch{}
    }
  };
})();

/* ---------- Фоновая анимация на canvas: светящиеся частицы-«искры» ---------- */
function backdrop(host,{count=110,hue='#dfff38',link=120}={}){
  if(!host||reduced)return;
  const cv=document.createElement('canvas');
  cv.className='fx-canvas';cv.setAttribute('aria-hidden','true');
  host.prepend(cv);
  const c=cv.getContext('2d');
  let w=0,h=0,dpr=1,vis=false,raf=0,last=0;
  const mouse={x:-9999,y:-9999,on:false};
  let boost=0,lastY=window.scrollY;
  const small=innerWidth<700;
  const n=small?Math.round(count*.5):count;
  const P=[];
  const size=()=>{
    const r=host.getBoundingClientRect();
    dpr=Math.min(devicePixelRatio||1,2);
    w=r.width;h=r.height;cv.width=w*dpr;cv.height=h*dpr;c.setTransform(dpr,0,0,dpr,0,0);
  };
  const seed=()=>{
    P.length=0;
    for(let i=0;i<n;i++)P.push({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:Math.random()*1.7+.6,a:Math.random()*6.28,p:Math.random()*6.28});
  };
  size();seed();
  new ResizeObserver(()=>{size();seed()}).observe(host);
  host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;mouse.on=true},{passive:true});
  host.addEventListener('pointerleave',()=>{mouse.on=false;mouse.x=mouse.y=-9999});
  const frame=t=>{
    raf=requestAnimationFrame(frame);
    const dt=Math.min((t-last)/16.7||1,3);last=t;
    const sy=window.scrollY;boost=boost*.92+Math.min(Math.abs(sy-lastY)*.02,2.5);lastY=sy;
    c.clearRect(0,0,w,h);
    const L=link*(small?.8:1);
    for(const p of P){
      /* медленное «течение» по полю углов */
      p.a+=(Math.sin(p.x*.004+t*.0003)+Math.cos(p.y*.005-t*.00025))*.02*dt;
      p.vx+=Math.cos(p.a)*.012*dt;p.vy+=Math.sin(p.a)*.012*dt-.002*dt;
      if(mouse.on){
        const dx=p.x-mouse.x,dy=p.y-mouse.y,d2=dx*dx+dy*dy;
        if(d2<24000){const d=Math.sqrt(d2)||1,f=(1-d/155)*1.1;p.vx+=dx/d*f*dt;p.vy+=dy/d*f*dt}
      }
      p.vx*=.965;p.vy*=.965;
      const k=1+boost;
      p.x+=p.vx*dt*k;p.y+=p.vy*dt*k;
      if(p.x<-10)p.x=w+10;else if(p.x>w+10)p.x=-10;
      if(p.y<-10)p.y=h+10;else if(p.y>h+10)p.y=-10;
    }
    c.lineWidth=1;
    for(let i=0;i<n;i++){
      const p=P[i];
      for(let j=i+1;j<n;j++){
        const q=P[j],dx=p.x-q.x,dy=p.y-q.y;
        if(dx>L||dx<-L||dy>L||dy<-L)continue;
        const d=Math.hypot(dx,dy);
        if(d<L){c.globalAlpha=(1-d/L)*.28;c.strokeStyle=hue;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke()}
      }
    }
    for(const p of P){
      const tw=.55+.45*Math.sin(t*.002+p.p);
      c.globalAlpha=.35+.55*tw;c.fillStyle=hue;
      c.shadowColor=hue;c.shadowBlur=10;
      c.beginPath();c.arc(p.x,p.y,p.r,0,6.283);c.fill();
    }
    c.shadowBlur=0;c.globalAlpha=1;
  };
  const run=()=>{if(vis&&!document.hidden&&!raf){last=performance.now();raf=requestAnimationFrame(frame)}else if((!vis||document.hidden)&&raf){cancelAnimationFrame(raf);raf=0}};
  new IntersectionObserver(([e])=>{vis=e.isIntersecting;run()},{rootMargin:'80px'}).observe(host);
  document.addEventListener('visibilitychange',run);
}

function hoverSound(){
  if(!finePointer)return;
  $$('.btn,.nav a,.nav-cta,.format-row__head,.footer a,.quick-contact__btn').forEach(el=>
    el.addEventListener('pointerenter',()=>sound.tick(920,.018,.08)));
}

/* ---------- Плавный скролл ---------- */
function smoothScroll(){
  if(reduced||!finePointer)return;
  lenis=new Lenis({duration:1.1,smoothWheel:true});
  lenis.on('scroll',ScrollTrigger.update);
  gsap.ticker.add(t=>lenis.raf(t*1000));
  gsap.ticker.lagSmoothing(0);
}

function splitWords(root){
  if(!root||root.dataset.wordsReady)return[];
  root.dataset.wordsReady='1';
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
  while(w.nextNode())nodes.push(w.currentNode);
  const words=[];
  nodes.forEach(n=>{
    if(!n.nodeValue.trim())return;
    const f=document.createDocumentFragment();
    n.nodeValue.split(/(\s+)/).forEach(p=>{
      if(/^\s+$/.test(p))f.append(document.createTextNode(p));
      else if(p){
        const s=document.createElement('span');
        s.className='split-word';
        s.textContent=p;
        f.append(s);
        words.push(s);
      }
    });
    n.parentNode.replaceChild(f,n);
  });
  return words;
}

let metrikaCounterId = 0;

function initAnalytics(){
  const configuredId = Number(import.meta.env.VITE_YANDEX_METRIKA_ID || 0);
  if(!Number.isSafeInteger(configuredId) || configuredId <= 0)return;

  metrikaCounterId = configuredId;
  window.ym = window.ym || function(){(window.ym.a = window.ym.a || []).push(arguments)};
  window.ym.l = window.ym.l || Date.now();

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://mc.yandex.ru/metrika/tag.js';
  document.head.append(script);

  window.ym(metrikaCounterId, 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: false
  });
}

function trackGoal(goal, params){
  if(!metrikaCounterId || typeof window.ym !== 'function')return;
  window.ym(metrikaCounterId, 'reachGoal', goal, params);
}

function analyticsClicks(){
  $$('a[href^="tel:"]').forEach(link => {
    link.addEventListener('click', () => trackGoal('click_phone'));
  });
  $$('a[href*="vk.me"],a[href*="vk.com/sergey.alexandrovich85"]').forEach(link => {
    link.addEventListener('click', () => trackGoal('click_vk'));
  });
}

function toast(t){
  const el=$('#toast');
  if(!el)return;
  el.textContent=t;
  el.classList.add('is-visible');
  clearTimeout(toast.t);
  toast.t=setTimeout(()=>el.classList.remove('is-visible'),2600);
}

function preloader(){
  const p=$('.preloader');
  if(!p)return Promise.resolve();
  if(reduced){
    p.remove();
    document.body.classList.remove('is-loading');
    return Promise.resolve();
  }
  const state={v:0},count=$('.preloader__count');
  return new Promise(resolve=>{
    gsap.timeline({
      onComplete:()=>{
        p.remove();
        document.body.classList.remove('is-loading');
        resolve();
      }
    })
    .from('.preloader__word',{yPercent:120,duration:.7,stagger:.08,ease:'power4.out'})
    .to(state,{v:100,duration:1,ease:'power2.inOut',onUpdate:()=>count.textContent=String(Math.round(state.v)).padStart(2,'0')},'<-.15')
    .to('.preloader__wipe',{height:'100%',duration:.55,ease:'power4.inOut'},'-=.15')
    .to(p,{yPercent:-100,duration:.75,ease:'power4.inOut'});
  });
}

function cursor(){
  if(reduced||matchMedia('(hover:none),(pointer:coarse)').matches)return;
  const c=$('.cursor');
  const x=gsap.quickTo(c,'x',{duration:.22});
  const y=gsap.quickTo(c,'y',{duration:.22});
  addEventListener('mousemove',e=>{x(e.clientX);y(e.clientY)});
  addEventListener('mouseenter',()=>gsap.to(c,{scale:1}));
  addEventListener('mouseleave',()=>gsap.to(c,{scale:0}));
  $$('a,button,input,select,textarea').forEach(el=>{
    el.addEventListener('mouseenter',()=>gsap.to(c,{scale:1.65,duration:.2}));
    el.addEventListener('mouseleave',()=>gsap.to(c,{scale:1,duration:.2}));
  });
}

function magnetic(){
  if(reduced||matchMedia('(hover:none),(pointer:coarse)').matches)return;
  $$('.magnetic').forEach(el=>{
    el.addEventListener('mousemove',e=>{
      const r=el.getBoundingClientRect();
      gsap.to(el,{x:(e.clientX-r.left-r.width/2)*.16,y:(e.clientY-r.top-r.height/2)*.16,duration:.3});
    });
    el.addEventListener('mouseleave',()=>gsap.to(el,{x:0,y:0,duration:.55,ease:'elastic.out(1,.35)'}));
  });
}

function nav(){
  const bar=$('[data-topbar]');
  let last=scrollY;
  addEventListener('scroll',()=>{
    const y=scrollY;
    bar.style.transform=y>last&&y>180?'translateY(-90px)':'translateY(0)';
    last=y;
  },{passive:true});
}

function hero(){
  const chars=$$('.hero__line').flatMap(el=>splitAny(el));
  if(reduced)return;
  gsap.timeline()
    .from(chars,{yPercent:120,opacity:0,duration:.9,stagger:.016,ease:'power4.out'})
    .from('.hero__meta span',{y:15,opacity:0,stagger:.08},'-=.55')
    .from('.hero__statement',{y:35,opacity:0,duration:.65},'-=.45')
    .from('.hero__round',{scale:0,rotate:-30,duration:.7,ease:'back.out(1.8)'},'-=.55')
    .from('[data-float-sticker]',{scale:0,rotate:-35,stagger:.1,ease:'back.out(2)'},'-=.65');

  gsap.to('[data-parallax-media]',{
    yPercent:10,
    scale:1.05,
    ease:'none',
    scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}
  });

  $$('[data-float-sticker]').forEach((el,i)=>{
    gsap.to(el,{y:i?-15:18,rotate:i?8:-14,duration:2.7+i,repeat:-1,yoyo:true,ease:'sine.inOut'});
  });
}

/* ---------- Прожектор: под курсором фото проявляется в цвете ---------- */
function spotlight(){
  const hero=$('.hero'),media=$('.hero__media'),color=$('.hero__color');
  if(!hero||!color||reduced)return;
  const R=finePointer?210:150;
  let x=0,y=0,tx=0,ty=0,r=0,tr=0,raf=0,hideT=0;
  const loop=()=>{
    x+=(tx-x)*.2;y+=(ty-y)*.2;r+=(tr-r)*.14;
    color.style.setProperty('--mx',x.toFixed(1)+'px');
    color.style.setProperty('--my',y.toFixed(1)+'px');
    color.style.setProperty('--mr',r.toFixed(1)+'px');
    raf=(Math.abs(tx-x)+Math.abs(ty-y)+Math.abs(tr-r)>.5)?requestAnimationFrame(loop):0;
  };
  const kick=()=>{if(!raf)raf=requestAnimationFrame(loop)};
  const point=e=>{
    clearTimeout(hideT);
    const b=media.getBoundingClientRect(),first=r<1&&tr<1;
    tx=e.clientX-b.left;ty=e.clientY-b.top;tr=R;
    if(first){x=tx;y=ty}
    kick();
  };
  const off=(delay=0)=>{clearTimeout(hideT);hideT=setTimeout(()=>{tr=0;kick()},delay)};
  hero.addEventListener('pointermove',point,{passive:true});
  hero.addEventListener('pointerdown',point,{passive:true});
  hero.addEventListener('pointerleave',()=>off());
  hero.addEventListener('pointerup',()=>off(finePointer?0:700));
  hero.addEventListener('pointercancel',()=>off(200));
}

/* ---------- Магнитные буквы имени: расходятся от курсора ---------- */
function magnetLetters(){
  const hero=$('.hero');
  if(!hero||reduced||!finePointer)return;
  const letters=$$('.hero__title .split-char');
  if(!letters.length)return;
  let mx=-9999,my=-9999,raf=0;
  const state=new Map(letters.map(l=>[l,{x:0,y:0}]));
  const step=()=>{
    let moving=false;
    for(const l of letters){
      const b=l.getBoundingClientRect(),s=state.get(l);
      const cx=b.left+b.width/2,cy=b.top+b.height/2;
      const dx=cx-mx,dy=cy-my,d=Math.hypot(dx,dy)||1;
      const f=d<220?(1-d/220)**1.6:0;
      const k=Math.min(b.height*.14,22);
      const gx=dx/d*f*k*.25,gy=dy/d*f*k;
      s.x+=(gx-s.x)*.18;s.y+=(gy-s.y)*.18;
      if(Math.abs(s.x)>.05||Math.abs(s.y)>.05||f>0)moving=true;
      l.style.translate=`${s.x.toFixed(1)}px ${s.y.toFixed(1)}px`;
    }
    raf=moving?requestAnimationFrame(step):0;
  };
  const kick=()=>{if(!raf)raf=requestAnimationFrame(step)};
  hero.addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY;kick()},{passive:true});
  hero.addEventListener('pointerleave',()=>{mx=my=-9999;kick()});
}

/* ---------- Конфетти при отправке заявки ---------- */
function confetti(from){
  if(reduced)return;
  const cv=document.createElement('canvas');
  cv.setAttribute('aria-hidden','true');
  cv.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9000';
  document.body.appendChild(cv);
  const dpr=Math.min(devicePixelRatio||1,2),W=innerWidth,H=innerHeight;
  cv.width=W*dpr;cv.height=H*dpr;
  const c=cv.getContext('2d');c.scale(dpr,dpr);
  const b=from?.getBoundingClientRect(),ox=b?b.left+b.width/2:W/2,oy=b?b.top+b.height/2:H*.6;
  const cols=['#dfff38','#ff5a36','#c8c6ff','#ffffff','#f3f0e9'];
  const n=innerWidth<700?110:190;
  const P=Array.from({length:n},()=>{
    const a=-Math.PI/2+(Math.random()-.5)*2.3,v=7+Math.random()*13;
    return{x:ox,y:oy,vx:Math.cos(a)*v,vy:Math.sin(a)*v,w:5+Math.random()*7,h:3+Math.random()*5,r:Math.random()*6.28,vr:(Math.random()-.5)*.4,col:cols[Math.random()*cols.length|0],circ:Math.random()<.25};
  });
  const t0=performance.now();
  const frame=t=>{
    const el=t-t0;
    c.clearRect(0,0,W,H);
    for(const p of P){
      p.vy+=.28;p.vx*=.992;p.vy*=.992;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;
      c.save();c.translate(p.x,p.y);c.rotate(p.r);
      c.globalAlpha=Math.max(0,Math.min(1,(3200-el)/900));
      c.fillStyle=p.col;
      if(p.circ){c.beginPath();c.arc(0,0,p.w/2,0,6.283);c.fill()}
      else c.fillRect(-p.w/2,-p.h/2,p.w,p.h*Math.abs(Math.cos(p.r*1.7)+.2));
      c.restore();
    }
    if(el<3200)requestAnimationFrame(frame);else cv.remove();
  };
  requestAnimationFrame(frame);
  [523,659,784,1047].forEach((f,i)=>setTimeout(()=>sound.tick(f,.06,.35),i*90));
}

function reveals(){
  if(reduced)return;
  $$('[data-reveal-line],.section-kicker,.mega-title').forEach(el=>{
    gsap.from(el,{y:42,opacity:0,duration:.8,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 86%',once:true}});
  });

  const wr=$('[data-word-reveal]');
  if(wr){
    wr.classList.add('word-reveal');
    gsap.to(splitWords(wr),{
      opacity:1,
      stagger:.02,
      ease:'none',
      scrollTrigger:{trigger:wr,start:'top 78%',end:'bottom 48%',scrub:true}
    });
  }

  const q=$('.promise blockquote');
  if(q){
    gsap.from(splitWords(q),{
      yPercent:100,
      opacity:0,
      stagger:.035,
      duration:.8,
      ease:'power4.out',
      scrollTrigger:{trigger:q,start:'top 78%',once:true}
    });
  }
}

function stack(){
  if(reduced)return;
  $$('[data-stack-card]').forEach((card,i)=>{
    gsap.to(card,{
      scale:1-(2-i)*.018,
      rotate:[-1.4,1.2,-.4][i],
      ease:'none',
      scrollTrigger:{trigger:card,start:'top 18%',end:'bottom top',scrub:true}
    });
  });
}

function portrait(){
  if(reduced)return;
  const s=$('.portrait-scene');
  gsap.fromTo('.photo-card--a',{x:-120,y:80,rotate:-12},{x:0,y:-20,rotate:-5,ease:'none',scrollTrigger:{trigger:s,start:'top bottom',end:'bottom top',scrub:1}});
  gsap.fromTo('.photo-card--b',{x:130,y:-20,rotate:12},{x:0,y:40,rotate:4,ease:'none',scrollTrigger:{trigger:s,start:'top bottom',end:'bottom top',scrub:1}});
  gsap.from('.portrait-scene__copy',{scale:.72,opacity:0,duration:.9,ease:'power3.out',scrollTrigger:{trigger:s,start:'top 70%',once:true}});
}

function formats(){
  $$('[data-format] .format-row__head').forEach(btn=>btn.addEventListener('click',()=>{
    const cur=btn.closest('[data-format]');
    const open=cur.classList.contains('is-open');
    const top0=btn.getBoundingClientRect().top;
    $$('[data-format]').forEach(x=>{
      x.classList.remove('is-open');
      $('.format-row__head',x).setAttribute('aria-expanded','false');
    });
    if(!open){
      cur.classList.add('is-open');
      btn.setAttribute('aria-expanded','true');
    }
    sound.tick(open?420:640);

    /* Раскрытие всегда идёт вниз: пока строки двигаются, удерживаем нажатый заголовок на месте экрана */
    const t0=performance.now();
    const hold=()=>{
      const d=btn.getBoundingClientRect().top-top0;
      if(Math.abs(d)>.5){
        const y=scrollY+d;
        if(lenis)lenis.scrollTo(y,{immediate:true,force:true});
        else window.scrollTo({top:y,behavior:'instant'});
      }
      if(performance.now()-t0<950)requestAnimationFrame(hold);
      else ScrollTrigger.refresh();
    };
    requestAnimationFrame(hold);
  }));

  if(!reduced){
    $$('[data-format]').forEach(row=>{
      gsap.from(row,{x:50,opacity:0,duration:.7,scrollTrigger:{trigger:row,start:'top 88%',once:true}});
    });
  }
}

function reels(){
  if(reduced||innerWidth<=980)return;
  const pin=$('[data-reels-pin]');
  const track=$('[data-reels-track]');
  const dist=()=>Math.max(0,track.scrollWidth-innerWidth+80);

  gsap.to(track,{
    x:()=>-dist(),
    ease:'none',
    scrollTrigger:{
      trigger:pin,
      start:'top top',
      end:()=>`+=${dist()+innerHeight*.75}`,
      pin:true,
      scrub:1,
      invalidateOnRefresh:true
    }
  });
}

function gallery(){
  $$('[data-gallery-shot]').forEach(shot=>{
    if(reduced){
      shot.style.clipPath='inset(0 round 18px)';
      return;
    }
    gsap.to(shot,{
      clipPath:'inset(0% 0% 0% 0% round 18px)',
      duration:.9,
      ease:'power4.out',
      scrollTrigger:{trigger:shot,start:'top 88%',once:true}
    });
    gsap.fromTo($('img',shot),{scale:1.1,yPercent:-4},{
      scale:1,
      yPercent:4,
      ease:'none',
      scrollTrigger:{trigger:shot,start:'top bottom',end:'bottom top',scrub:.6}
    });
  });
}

function videos(){
  const m=$('#videoModal');
  const f=$('#videoFrame');
  const stop=()=>{
    const v=$('video',f);
    if(v)v.pause();
    f.replaceChildren();
  };
  $$('.js-video').forEach(c=>c.addEventListener('click',()=>{
    const v=document.createElement('video');
    v.src=`/video/${c.dataset.video}.mp4`;
    v.controls=true;
    v.autoplay=true;
    v.playsInline=true;
    v.preload='metadata';
    v.setAttribute('aria-label','Видео с мероприятия');
    f.replaceChildren(v);
    m.showModal();
    lenis?.stop();
    v.play().catch(()=>{});
  }));
  $('.video-modal__close',m)?.addEventListener('click',()=>m.close());
  m.addEventListener('click',e=>{if(e.target===m)m.close()});
  m.setAttribute('data-lenis-prevent','');
  m.addEventListener('close',()=>{stop();lenis?.start()});
}

function leadText(d){
  const date=d.date?new Date(`${d.date}T12:00:00`).toLocaleDateString('ru-RU'):'—';
  return [
    'Сергей, здравствуйте! Хочу уточнить свободна ли дата.',
    `Событие: ${d.event}`,
    `Дата: ${date}`,
    `Город: ${d.city}`,
    `Имя: ${d.name}`,
    `Телефон: ${d.phone}`,
    d.guests?`Гостей: ${d.guests}`:'',
    `Удобно ответить: ${d.contactMethod}`,
    d.comment?`Комментарий: ${d.comment}`:''
  ].filter(Boolean).join('\n');
}

async function vkFallback(d){
  trackGoal('vk_fallback_open');
  try{
    await navigator.clipboard.writeText(leadText(d));
    toast('Заявка скопирована — открываю VK');
  }catch{
    toast('Открываю VK для связи');
  }
  setTimeout(()=>window.open('https://vk.me/sergey.alexandrovich85','_blank','noopener'),300);
}

function form(){
  const form=$('#leadForm');
  const success=$('#leadSuccess');
  const status=$('#formStatus');
  const submit=$('.lead-submit',form);

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    status.textContent='';
    status.classList.remove('is-error');
    if(!form.reportValidity())return;

    const fd=new FormData(form);
    const d=Object.fromEntries(fd.entries());
    d.event=fd.get('event');
    d.page=location.href;

    submit.disabled=true;
    submit.classList.add('is-busy');

    try{
      const r=await fetch('/api/lead',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(d)
      });
      const j=await r.json().catch(()=>({}));

      if(r.ok&&j.ok){
        trackGoal('lead_submit_success', {event:d.event});
        form.hidden=true;
        success.hidden=false;
        const sb=success.getBoundingClientRect();
        form.reset();
        toast('Заявка отправлена');
        success.scrollIntoView({block:'center',behavior:reduced?'auto':'smooth'});
        confetti({getBoundingClientRect:()=>({left:sb.left,top:innerHeight*.66,width:sb.width||innerWidth,height:0})});
        if(!reduced)gsap.from(success.children,{y:30,opacity:0,stagger:.07});
      }else if(j.needsConfig){
        status.textContent='Автоматический приём заявок пока не настроен. Текст подготовлен для отправки через VK.';
        status.classList.add('is-error');
        await vkFallback(d);
      }else{
        throw Error(j.message||'Ошибка');
      }
    }catch{
      status.textContent='Не удалось отправить заявку автоматически. Текст подготовлен для отправки через VK.';
      status.classList.add('is-error');
      await vkFallback(d);
    }finally{
      submit.disabled=false;
      submit.classList.remove('is-busy');
    }
  });

  $('#sendAnother')?.addEventListener('click',()=>{
    success.hidden=true;
    form.hidden=false;
  });
}

function footer(){
  const chars=[];
  $$('[data-footer-name]').forEach(x=>chars.push(...splitAny(x,'footer-char')));

  if(!reduced){
    gsap.from(chars,{
      yPercent:125,
      rotate:6,
      opacity:0,
      duration:1.3,
      stagger:.035,
      ease:'power4.out',
      scrollTrigger:{trigger:'.footer__name',start:'top 92%',once:true}
    });
    gsap.from('.footer__orb',{
      scale:0,
      rotate:-40,
      duration:.8,
      ease:'back.out(1.8)',
      scrollTrigger:{trigger:'.footer',start:'top 65%',once:true}
    });
  }

  if(!reduced&&!matchMedia('(hover:none),(pointer:coarse)').matches){
    $('.footer').addEventListener('mousemove',e=>{
      const r=$('.footer').getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5;
      const y=(e.clientY-r.top)/r.height-.5;
      gsap.to('.footer__orb',{x:x*110,y:y*80,duration:.7});
      gsap.to('.footer__name-line:first-child',{x:x*18,duration:.6});
      gsap.to('.footer__name-line:last-child',{x:-x*22,duration:.6});
    });
  }
}

function anchors(){
  $$('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
    const t=$(a.getAttribute('href'));
    if(!t)return;
    e.preventDefault();
    if(lenis)lenis.scrollTo(t,{offset:0});
    else t.scrollIntoView({behavior:reduced?'auto':'smooth'});
  }));
}

async function init(){
  initAnalytics();
  analyticsClicks();
  const contentReady=loadContent();
  sound.init();
  faq();
  quickContact();
  nav();
  cursor();
  magnetic();
  formats();
  videos();
  form();
  anchors();

  const fonts=Promise.race([
    Promise.all([document.fonts.load(OUTLINE_FONT,'А'),document.fonts.load('800 100px Manrope','Й')]),
    new Promise(r=>setTimeout(r,2500))
  ]).catch(()=>{});
  await Promise.all([preloader(),fonts]);
  const content=await contentReady;
  renderVenues(content.venues);
  renderReviews(content.reviews);
  dateGuard(content.busyDates);
  smoothScroll();
  backdrop($('.footer'),{count:80,hue:'#c8c6ff'});
  tilt();
  hoverSound();
  reelPreviews();

  hero();
  spotlight();
  magnetLetters();
  reveals();
  stack();
  portrait();
  reels();
  gallery();

  if(!reduced){
    gsap.to('.promise__photo',{
      yPercent:12,
      ease:'none',
      scrollTrigger:{trigger:'.promise',start:'top bottom',end:'bottom top',scrub:true}
    });
  }

  footer();
  setTimeout(()=>ScrollTrigger.refresh(),700);
}

init();
