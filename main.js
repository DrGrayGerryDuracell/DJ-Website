let lastScrollTop = 0;

window.addEventListener("scroll", function () {
  const header = document.querySelector(".main-header");
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  if (scrollTop > lastScrollTop) {
    header.style.top = "-80px"; // ausblenden
  } else {
    header.style.top = "0"; // einblenden
  }

  lastScrollTop = scrollTop;
});