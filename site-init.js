const ANIMATION_QUERY_PARAMETER = "animate";
const LOCAL_FILE_PROTOCOL = "file:";
const MANIFEST_SELECTOR = "[data-site-manifest]";
const pageQuery = new URLSearchParams(
  window.location.search,
);
const manifest = document.querySelector(MANIFEST_SELECTOR);

if (pageQuery.has(ANIMATION_QUERY_PARAMETER)) {
  document.documentElement.classList.add("force-animation");
}

if (
  manifest &&
  window.location.protocol !== LOCAL_FILE_PROTOCOL
) {
  manifest.setAttribute("rel", "manifest");
}
