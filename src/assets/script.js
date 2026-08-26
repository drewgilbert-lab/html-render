/* Page behaviour: FAQ disclosure + side-nav scroll spy.
   Progressive enhancement only — the page is complete without it. */
(function () {
  var root = document.currentScript ? document.currentScript.closest('.__page_class__') : null;
  if (!root) root = document.querySelector('.__page_class__');
  if (!root) return;

  root.addEventListener('click', function (event) {
    var button = event.target.closest ? event.target.closest('.faq-question') : null;
    if (!button || !root.contains(button)) return;
    var item = button.parentElement;
    var open = item.classList.toggle('open');
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  var links = Array.prototype.slice.call(root.querySelectorAll('.sidenav .nav-card a[href^="#"]'));
  if (!links.length || typeof IntersectionObserver !== 'function') return;
  var sections = links
    .map(function (a) { return root.querySelector('[id="' + a.getAttribute('href').slice(1) + '"]'); })
    .filter(Boolean);
  if (!sections.length) return;

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    },
    { rootMargin: '0px 0px -60% 0px', threshold: 0 }
  );
  sections.forEach(function (section) { observer.observe(section); });
})();
