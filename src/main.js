import './styles.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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

function toast(t){
  const el=$('#toast');
  if(!el)return;
  el.textContent=t;
  el.classList.add('is-visible');
  clearTimeout(toast.t);
  toast.t=setTimeout(()=>el.classList.remove('is-visible'),2600);
}

function fallbackImages(){
  $$('img[src*="lh3.googleusercontent.com/d/"]').forEach(img=>img.addEventListener('error',()=>{
    if(img.dataset.fb)return;
    img.dataset.fb=1;
    const m=img.src.match(/\/d\/([^=/?]+)/);
    if(m)img.src=`https://drive.google.com/thumbnail?id=${m[1]}&sz=w1800`;
  }));
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
  const chars=$$('.hero__line').flatMap(splitLetters);
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
    $$('[data-format]').forEach(x=>{
      x.classList.remove('is-open');
      $('.format-row__head',x).setAttribute('aria-expanded','false');
    });
    if(!open){
      cur.classList.add('is-open');
      btn.setAttribute('aria-expanded','true');
    }
    setTimeout(()=>ScrollTrigger.refresh(),300);
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
  $$('.js-video').forEach(c=>c.addEventListener('click',()=>{
    f.innerHTML=`<iframe src="https://drive.google.com/file/d/${c.dataset.video}/preview" allow="autoplay; fullscreen" allowfullscreen title="Видео с мероприятия"></iframe>`;
    m.showModal();
  }));
  $('.video-modal__close',m)?.addEventListener('click',()=>m.close());
  m.addEventListener('click',e=>{if(e.target===m)m.close()});
  m.addEventListener('close',()=>f.innerHTML='');
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
        form.hidden=true;
        success.hidden=false;
        form.reset();
        toast('Заявка отправлена ✓');
        if(!reduced)gsap.from(success.children,{y:30,opacity:0,stagger:.07});
      }else if(j.needsConfig){
        status.textContent='Канал приёма ещё не подключён. Текст заявки скопирован — открою VK.';
        status.classList.add('is-error');
        await vkFallback(d);
      }else{
        throw Error(j.message||'Ошибка');
      }
    }catch{
      status.textContent='Автоотправка сейчас недоступна. Текст заявки подготовлен для VK.';
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
  $$('[data-footer-name]').forEach(x=>chars.push(...splitLetters(x,'footer-char')));

  if(!reduced){
    gsap.from(chars,{
      yPercent:125,
      rotate:4,
      duration:1.05,
      stagger:.015,
      ease:'power4.out',
      scrollTrigger:{trigger:'.footer__name',start:'top 84%',once:true}
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
    t.scrollIntoView({behavior:reduced?'auto':'smooth'});
  }));
}

async function init(){
  fallbackImages();
  nav();
  cursor();
  magnetic();
  formats();
  videos();
  form();
  anchors();

  await preloader();

  hero();
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
