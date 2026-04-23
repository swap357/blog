(function () {
  var sections = [
    { href: "/", label: "index" },
    { href: "/projects/", label: "projects" },
    { href: "/about/", label: "about" }
  ];

  window.mountPortalNav = function (target, current) {
    current = current || "";
    var root = typeof target === "string" ? document.querySelector(target) : target;
    if (!root) return;

    root.className = "portal-nav-wrap";
    root.innerHTML =
      '<nav class="portal-nav" aria-label="Primary">' +
      sections
        .map(function (s) {
          var active = s.href === current ? ' class="active"' : "";
          return '<a href="' + s.href + '"' + active + ">" + s.label + "</a>";
        })
        .join("") +
      "</nav>";

    var idx = -1;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].href === current) { idx = i; break; }
    }

    document.addEventListener("keydown", function (e) {
      var tag = (document.activeElement || {}).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;

      if (e.key === "ArrowLeft") {
        if (idx > 0) window.location.href = sections[idx - 1].href;
        else if (idx === -1 && current !== "/") window.location.href = "/";
      } else if (e.key === "ArrowRight" && idx >= 0 && idx < sections.length - 1) {
        window.location.href = sections[idx + 1].href;
      }
    });
  };
})();
