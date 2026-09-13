import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parse } from "parse5";
import Eleventy from "@11ty/eleventy";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = join(ROOT, "dist");
const ORIGIN = "https://site.test";
const people = JSON.parse(readFileSync(join(ROOT, "src/_data/people.json"), "utf8"));
const readOutput = (path) => readFileSync(join(OUTPUT, path), "utf8");
const attribute = (node, name) => node.attrs?.find((attr) => attr.name === name)?.value;
const elements = (node) => [node, ...(node.childNodes || []).flatMap(elements)];
const text = (node) => node.nodeName === "#text" ? node.value : (node.childNodes || []).map(text).join("");
const hasClass = (node, name) => attribute(node, "class")?.split(/\s+/).includes(name);
const files = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]);

test("generated pages have unique IDs and working local asset and navigation references", () => {
  for (const path of ["index.html", "about/index.html"]) {
    const nodes = elements(parse(readOutput(path)));
    const pageUrl = new URL(path, ORIGIN);
    const base = new URL(attribute(nodes.find((node) => node.tagName === "base") || {}, "href") || pageUrl.href, pageUrl);
    const ids = nodes.map((node) => attribute(node, "id")).filter(Boolean);
    assert.equal(new Set(ids).size, ids.length, path + " has duplicate IDs");
    for (const node of nodes) {
      for (const name of ["src", "href"]) {
        const value = attribute(node, name);
        if (!value) continue;
        const url = new URL(value, base);
        if (url.origin !== ORIGIN) continue;
        const target = url.pathname.endsWith("/") ? url.pathname + "index.html" : url.pathname;
        assert.ok(existsSync(join(OUTPUT, decodeURIComponent(target))), path + " missing " + value);
        if (url.hash && url.pathname === pageUrl.pathname) {
          assert.ok(ids.includes(decodeURIComponent(url.hash.slice(1))), path + " missing anchor " + value);
        }
      }
      for (const id of (attribute(node, "aria-labelledby") || "").split(/\s+/).filter(Boolean)) {
        assert.ok(ids.includes(id), path + " missing accessible label " + id);
      }
    }
  }
});

test("people data drives profiles, interests, accessible labels, and jump links", () => {
  const nodes = elements(parse(readOutput("about/index.html")));
  const profiles = nodes.filter((node) => node.tagName === "article" && hasClass(node, "person"));
  const nav = nodes.find((node) => hasClass(node, "people-nav"));
  const links = elements(nav).filter((node) => node.tagName === "a");
  assert.equal(profiles.length, people.length);
  assert.equal(links.length, people.length);
  people.forEach((person, index) => {
    const profile = profiles[index];
    const children = elements(profile);
    const heading = children.find((node) => node.tagName === "h2");
    assert.equal(attribute(profile, "id"), person.id);
    assert.equal(text(heading), person.name + (person.nameDot ? "." : ""));
    assert.equal(elements(heading).filter((node) => node.tagName === "p").length, 0, "Biography must follow the name heading");
    assert.equal(hasClass(profile, "person--reverse") || false, index % 2 === 1);
    assert.equal(attribute(links[index], "href"), "#" + person.id);
    assert.equal(attribute(links[index], "aria-label"), person.name);
    const portrait = children.find((node) => node.tagName === "img");
    assert.equal(attribute(portrait, "alt"), person.name + "'s portrait");
    const list = children.find((node) => hasClass(node, "interest-list"));
    assert.equal(attribute(list, "aria-label"), person.name + "'s interests");
    assert.deepEqual(elements(list).filter((node) => node.tagName === "li").map(text), person.interests.map((interest) => interest.label));
  });
});

test("an added person renders everywhere and special characters remain text", async () => {
  const added = {
    ...people[0],
    id: "template-probe",
    name: 'A <B> & "C"',
    role: "R&D <tools>",
    interests: [{ label: "Graphics <canvas> & shaders" }],
  };
  const site = new Eleventy(undefined, undefined, {
    quietMode: true,
    // Eleventy's data cascade appends this entry to the file-backed people array
    config(config) { config.addGlobalData("people", [added]); },
  });
  const pages = await site.toJSON();
  const html = pages.find((page) => page.url === "/about/").content;
  const nodes = elements(parse(html));
  const profile = nodes.find((node) => attribute(node, "id") === added.id);
  const children = elements(profile);
  assert.equal(nodes.filter((node) => node.tagName === "article").length, people.length + 1);
  assert.equal(text(children.find((node) => hasClass(node, "given-name"))), added.name);
  assert.ok(nodes.some((node) => attribute(node, "href") === "#" + added.id && attribute(node, "aria-label") === added.name));
  assert.equal(attribute(children.find((node) => node.tagName === "img"), "alt"), added.name + "'s portrait");
  const interestList = children.find((node) => hasClass(node, "interest-list"));
  assert.equal(text(elements(interestList).find((node) => node.tagName === "li")), added.interests[0].label);
  assert.doesNotMatch(html, /<B>|<tools>|<canvas>/);
});

test("homepage About links work without preview controls or forced motion", () => {
  const home = elements(parse(readOutput("index.html")));
  const aboutLinks = home.filter((node) => hasClass(node, "home-about-link") || hasClass(node, "eye-about-link"));
  assert.equal(aboutLinks.length, 2);
  for (const link of aboutLinks) {
    assert.equal(attribute(link, "href"), "about/");
    assert.equal(attribute(link, "target"), undefined);
  }
  assert.equal(home.some((node) => attribute(node, "id") === "label-toggle" || hasClass(node, "concept-controls")), false);
  assert.equal(existsSync(join(OUTPUT, "about/navigation-preview.html")), false);
  const scripts = (nodes) => nodes.filter((node) => node.tagName === "script" && attribute(node, "src"))
    .map((node) => new URL(attribute(node, "src"), ORIGIN).pathname);
  assert.deepEqual(scripts(home), ["/site-init.js", "/logo-webgl.js", "/logo-motion.js"]);
  assert.equal(home.some((node) => attribute(node, "name") === "robots"), false);
  const about = elements(parse(readOutput("about/index.html")));
  assert.ok(about.some((node) => attribute(node, "name") === "robots" && attribute(node, "content") === "noindex"));
});

test("deployment contains only public assets and preserves renderer and brand bytes", () => {
  const extensions = new Set([".html", ".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".webmanifest"]);
  for (const path of files(OUTPUT)) assert.ok(extensions.has(extname(path)), "Unexpected published file: " + path);
  for (const path of ["src", "node_modules", "brand", "scripts", "test", "package.json", "eleventy.config.mjs", "README.md"]) {
    assert.equal(existsSync(join(OUTPUT, path)), false, path + " must not be published");
  }
  for (const path of ["logo-motion.js", "logo-webgl.js", "site-init.js", "styles.css", "palette.css", "wordmark.svg", "mark.svg", "mark-transparent.svg", "mark-motion-initial.svg"]) {
    assert.deepEqual(readFileSync(join(OUTPUT, path)), readFileSync(join(ROOT, path)), path);
  }
});
