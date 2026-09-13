// Upgrade old HashRouter bookmarks before BrowserRouter starts.
(function () {
  const { hash } = window.location;
  if (!hash.startsWith("#/") || hash.startsWith("#//")) return;
  const target = new URL(hash.slice(1), window.location.origin);
  if (target.origin !== window.location.origin) return;
  window.history.replaceState(window.history.state, "", target.pathname + target.search + target.hash);
})();
