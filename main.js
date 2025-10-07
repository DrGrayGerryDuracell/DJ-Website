document.getElementById('year').textContent = new Date().getFullYear();
const menuToggle = document.getElementById('menuToggle');
const nav = document.querySelector('.nav');
menuToggle?.addEventListener('click', () => {
  const open = nav.style.display === 'block';
  nav.style.display = open ? 'none' : 'block';
});
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if(el){
      e.preventDefault();
      window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
    }
  });
});