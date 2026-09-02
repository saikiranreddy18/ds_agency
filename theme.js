/* Applies the saved theme before first paint. Dark is the default. */
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t === "light") document.documentElement.setAttribute("data-theme", "light");
    // Optional no-animation mode chosen on the site (in addition to the OS setting).
    if (localStorage.getItem("motion") === "reduced") document.documentElement.setAttribute("data-motion", "reduced");
  } catch (e) { /* storage unavailable */ }
})();
