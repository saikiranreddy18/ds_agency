/* Applies the saved theme before first paint. Dark is the default. */
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t === "light") document.documentElement.setAttribute("data-theme", "light");
  } catch (e) { /* storage unavailable */ }
})();
