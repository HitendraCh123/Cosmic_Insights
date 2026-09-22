
const menu=document.querySelector('.menu'), links=document.querySelector('.links');
if(menu)menu.onclick=()=>{links.classList.toggle('open');menu.textContent=links.classList.contains('open')?'×':'☰'};
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const t=document.querySelector(a.getAttribute('href'));if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth'});links?.classList.remove('open');if(menu)menu.textContent='☰'}}));
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(x=>observer.observe(x));
const form=document.querySelector('#consultationForm');
if(form)form.addEventListener('submit',e=>{e.preventDefault();document.querySelector('.toast')?.classList.add('show');form.reset();setTimeout(()=>document.querySelector('.toast')?.classList.remove('show'),4500)});
