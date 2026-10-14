// Keep the existing branch language preference. Shared measurement owns every click.
(function () {
  const body = document.querySelector('body[data-branch]');
  if (body && body.dataset.pageKind !== 'menu') {
    try { localStorage.setItem('sy-lang', document.documentElement.lang); } catch {}
  }
})();
