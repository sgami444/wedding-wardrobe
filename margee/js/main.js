(()=>{
  const reveals=[...document.querySelectorAll('[data-reveal]')];
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if('IntersectionObserver' in window && !reduced){
    const io=new IntersectionObserver((entries)=>{
      for(const e of entries)if(e.isIntersecting){e.target.classList.add('is-revealed');io.unobserve(e.target)}
    },{threshold:0.08,rootMargin:'0px 0px -36px 0px'});
    reveals.forEach((el)=>io.observe(el));
  }else reveals.forEach(el=>el.classList.add('is-revealed'));
  // Keep the gentle feather motion active only while its section is visible.
  const motionSections = document.querySelectorAll('.hero, .event, .chapters, .logistics');
  if ('IntersectionObserver' in window && !reduced) {
    const motionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('is-motion-active', entry.isIntersecting));
    });
    motionSections.forEach(section => motionObserver.observe(section));
  }
  document.addEventListener('visibilitychange', () => {
    document.documentElement.toggleAttribute('data-motion-paused', document.hidden);
  });
  let ticking=false;
  const back=document.querySelector('.back-top');
  function sync(){
    const range=document.documentElement.scrollHeight-window.innerHeight;
    document.documentElement.style.setProperty('--progress', (range?Math.min(100,100*window.scrollY/range):0)+'%');
    back.classList.toggle('is-visible',window.scrollY>850);
    ticking=false;
  }
  window.addEventListener('scroll',()=>{if(!ticking){window.requestAnimationFrame(sync);ticking=true}},{passive:true});
  window.addEventListener('resize',sync,{passive:true});
  sync();
})();
