// Convert legacy deep links after nginx serves the application shell.
(function () {
  const { pathname, search, hash } = window.location;
  if (pathname === "/" || pathname === "/index.html") return;
  const route = hash.startsWith("#/") ? hash : "#" + pathname + search + hash;
  window.history.replaceState(window.history.state, "", "/" + route);
})();
