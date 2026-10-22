// Guide test for setup/ARCHITECTURE/image-display.md.
//
// This file does not test behaviour. It reads source files as text and fails
// when code breaks a rule that the guide states. Each failure message names
// the rule, the file and line, and the guide. Each exception has a one-line
// reason, and a stale exception fails the test.
//
// Invariants row 4 (the `*_alt` column) is about meaning, so it has no test here.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const GUIDE = "setup/ARCHITECTURE/image-display.md";
const JS_DIR = "frontend/assets/js";

// Row builders. The three DOM builders create `news-blog-row` markup with
// `createElement`; the two template builders return an HTML string. The guide
// says to change all three DOM builders together (Shape, row thumbnails).
const DOM_ROW_BUILDERS = [
  `${JS_DIR}/news-and-blog.js`,
  `${JS_DIR}/blog-list.js`,
  `${JS_DIR}/news-list.js`,
];
const TEMPLATE_ROW_BUILDERS = [`${JS_DIR}/evidence-list.js`, `${JS_DIR}/search.js`];

// Class names that the three DOM builders must all write, so the markup stays
// the same in each (Shape, row thumbnails).
const SHARED_ROW_CLASSES = [
  "news-blog-row",
  "news-blog-row-thumb",
  "news-blog-row-thumb--empty",
  "news-blog-row-body",
  "news-blog-row-title",
  "news-blog-row-meta",
];

// Row 1: files whose image has no size on the tag. The challenge picture comes
// from an upload, so its size is not known when the script builds the tag.
const NO_SIZE_EXCEPTIONS = {
  "frontend/assets/js/challenge-detail.js": "Challenge picture: size comes from the uploaded file (guide Patterns).",
};

// Row 1: the map background. One template serves every map, the maps differ in
// shape, and the database stores no size (guide row 7).
const MAP_IMAGE = /\sid="map-image"/;

// Row 2: images that may load without `loading="lazy"` or `data-src`.
const EAGER_IMAGE_EXCEPTIONS = {
  "frontend/index.html": "Above-fold hero image on the home page (guide row 2).",
};

// Row 2: the site mark in the page header and footer is chrome, not content.
const SITE_MARK = /favicon-64\.png/;

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(REPO, relPath));
}

/** Every file below `relDir` with one of `extensions`, as repo-relative paths. */
function filesUnder(relDir, extensions) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(REPO, relDir), { withFileTypes: true })) {
    const rel = path.posix.join(relDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "tests") continue;
      out.push(...filesUnder(rel, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext)) && !entry.name.endsWith(".test.js")) {
      out.push(rel);
    }
  }
  return out;
}

// An HTML comment is blanked but keeps its newlines, so line numbers stay true.
function withoutHtmlComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\n]/g, " "));
}

/**
 * Every `<img ...>` tag in a file, with its line number. A tag inside a `//`
 * or `*` comment line is skipped, because comments name the tag in prose.
 */
function imgTags(relPath) {
  const text = withoutHtmlComments(read(relPath));
  const tags = [];
  for (const match of text.matchAll(/<img\b[^>]*>/g)) {
    const lineStart = text.lastIndexOf("\n", match.index) + 1;
    if (/^\s*(\/\/|\*)/.test(text.slice(lineStart, match.index))) continue;
    tags.push({ tag: match[0], line: text.slice(0, match.index).split("\n").length });
  }
  return tags;
}

const sourceFiles = filesUnder("frontend", [".html", ".js"]);
const filesWithImages = sourceFiles.filter((file) => imgTags(file).length > 0);

// ── Spans: the files that the guide names exist ───────────────────────────────

describe(`${GUIDE} header: the Spans files exist`, () => {
  const spansLine = read(GUIDE).split("\n").find((line) => line.startsWith("**Spans:**"));
  const spanned = [...(spansLine || "").matchAll(/`([^`]+)`/g)].map((match) => match[1]);

  test("finds the Spans line", () => {
    assert.ok(spanned.length > 0, `${GUIDE} has no **Spans:** line with files.`);
  });

  for (const file of spanned) {
    test(`${file} exists`, () => {
      assert.ok(exists(file), `${file} is named in the Spans line of ${GUIDE} but is missing.`);
    });
  }
});

// ── Row 1: every content <img> has width and height ──────────────────────────

describe(`${GUIDE} row 1: images carry width and height`, () => {
  test("finds files with images to scan", () => {
    assert.ok(filesWithImages.length > 0, "No <img> tags found in frontend/.");
  });

  for (const file of filesWithImages) {
    test(`${file}: each <img> has width and height`, () => {
      if (file in NO_SIZE_EXCEPTIONS) return;
      for (const { tag, line } of imgTags(file)) {
        if (MAP_IMAGE.test(tag)) continue;
        assert.ok(
          /\swidth=/.test(tag) && /\sheight=/.test(tag),
          `${file}:${line} has an <img> without width and height. The browser cannot reserve the space. Rule: ${GUIDE}, Invariants row 1.`
        );
      }
    });
  }
});

describe(`${GUIDE} row 1: size exceptions are current`, () => {
  test("every no-size exception names a file that still exists", () => {
    for (const [file, reason] of Object.entries(NO_SIZE_EXCEPTIONS)) {
      assert.ok(exists(file), `NO_SIZE_EXCEPTIONS names ${file} (${reason}) but it is missing. Remove the exception.`);
    }
  });
});

// ── Row 2: lazy loading, and data-src needs main.js ──────────────────────────

describe(`${GUIDE} row 2: images load lazily`, () => {
  for (const file of filesWithImages) {
    test(`${file}: each <img> has loading="lazy" or data-src`, () => {
      if (file in EAGER_IMAGE_EXCEPTIONS) return;
      for (const { tag, line } of imgTags(file)) {
        if (SITE_MARK.test(tag)) continue;
        assert.ok(
          /loading="lazy"|\sdata-src=/.test(tag),
          `${file}:${line} has an <img> without loading="lazy" or data-src. Rule: ${GUIDE}, Invariants row 2.`
        );
      }
    });
  }

  test("every eager-image exception names a file that still exists", () => {
    for (const [file, reason] of Object.entries(EAGER_IMAGE_EXCEPTIONS)) {
      assert.ok(exists(file), `EAGER_IMAGE_EXCEPTIONS names ${file} (${reason}) but it is missing. Remove the exception.`);
    }
  });

  const dataSrcScripts = sourceFiles.filter(
    (file) => file.startsWith(`${JS_DIR}/`) && !file.endsWith("utils/lazy-load.js") && /\sdata-src=/.test(read(file))
  );
  const pages = sourceFiles.filter((file) => file.endsWith(".html"));

  test("finds the scripts that write data-src", () => {
    assert.ok(dataSrcScripts.length > 0, `No script under ${JS_DIR}/ writes data-src.`);
  });

  for (const script of dataSrcScripts) {
    const scriptUrl = `/${script.replace(/^frontend\//, "")}`;
    for (const page of pages.filter((file) => read(file).includes(scriptUrl))) {
      test(`${page} loads main.js beside ${path.posix.basename(script)}`, () => {
        assert.ok(
          read(page).includes("/assets/js/main.js"),
          `${page} loads ${scriptUrl}, which writes data-src, but not /assets/js/main.js. The images never load. Rule: ${GUIDE}, Invariants row 2.`
        );
      });
    }
  }

  test("main.js imports and calls initLazyLoad()", () => {
    const main = read(`${JS_DIR}/main.js`);
    assert.ok(
      main.includes("import { initLazyLoad }") && main.includes("initLazyLoad();"),
      `${JS_DIR}/main.js does not import and call initLazyLoad(). Rule: ${GUIDE}, Invariants row 2.`
    );
  });
});

// ── Row 7: the map background ────────────────────────────────────────────────

describe(`${GUIDE} row 7: the map background`, () => {
  const mapPages = sourceFiles.filter(
    (file) => file.startsWith("frontend/evidence/maps/") && file.endsWith(".html") && read(file).includes('id="map-viewport"')
  );

  test("finds the map pages", () => {
    assert.ok(mapPages.length > 0, "No map page with id=\"map-viewport\" found under frontend/evidence/maps/.");
  });

  for (const page of mapPages) {
    test(`${page} has one map-image with an empty src`, () => {
      const images = imgTags(page).filter(({ tag }) => MAP_IMAGE.test(tag));
      assert.equal(
        images.length,
        1,
        `${page} has ${images.length} <img id="map-image"> tags. It needs exactly one. Rule: ${GUIDE}, Invariants row 7.`
      );
      assert.ok(
        /class="map-image"/.test(images[0].tag) && /\ssrc=""/.test(images[0].tag),
        `${page}:${images[0].line} map image needs class="map-image" and src="" for renderRegion() to fill. Rule: ${GUIDE}, Invariants row 7.`
      );
    });
  }

  test("maps-render.js sets the map image src and alt", () => {
    const text = read(`${JS_DIR}/maps/maps-render.js`);
    assert.ok(
      /mapImageEl\.src\s*=/.test(text) && /mapImageEl\.alt\s*=/.test(text),
      `${JS_DIR}/maps/maps-render.js does not set mapImageEl.src and mapImageEl.alt. The map page shows an empty box. Rule: ${GUIDE}, Invariants row 7.`
    );
  });

  test(".map-image stays width: 100% and height: auto", () => {
    const css = read("frontend/assets/css/pages/maps/maps-canvas.css");
    const block = css.match(/\.map-image\s*\{([^}]*)\}/);
    assert.ok(block, "frontend/assets/css/pages/maps/maps-canvas.css has no .map-image rule.");
    assert.ok(
      /width:\s*100%/.test(block[1]) && /height:\s*auto/.test(block[1]),
      `.map-image in maps-canvas.css is not width: 100%; height: auto. A fixed size distorts the other maps. Rule: ${GUIDE}, Invariants row 7.`
    );
  });
});

// ── Row 3: a row with no thumbnail renders a placeholder ─────────────────────

describe(`${GUIDE} row 3: no thumbnail renders a placeholder`, () => {
  for (const file of DOM_ROW_BUILDERS) {
    test(`${file} has the placeholder branch`, () => {
      assert.ok(
        read(file).includes("news-blog-row-thumb--empty"),
        `${file} never writes news-blog-row-thumb--empty. A row with no thumbnail needs a placeholder <div>. Rule: ${GUIDE}, Invariants row 3.`
      );
    });
  }

  for (const file of TEMPLATE_ROW_BUILDERS) {
    test(`${file} has the placeholder branch and no empty src`, () => {
      assert.ok(
        read(file).includes("thumb-placeholder"),
        `${file} never writes a thumb-placeholder. A row with no thumbnail needs a placeholder <div>. Rule: ${GUIDE}, Invariants row 3.`
      );
      for (const { tag, line } of imgTags(file)) {
        if (!/\ssrc=""/.test(tag)) continue;
        assert.ok(
          /\sdata-src=/.test(tag),
          `${file}:${line} has an <img> with an empty src and no data-src. It fires a request and shows the broken-image glyph. Rule: ${GUIDE}, Invariants row 3.`
        );
      }
    });
  }
});

// ── Row 5: row thumbnails have an empty alt ──────────────────────────────────

describe(`${GUIDE} row 5: row thumbnails use alt=""`, () => {
  for (const file of DOM_ROW_BUILDERS) {
    test(`${file} sets img.alt to an empty string`, () => {
      assert.ok(
        /img\.alt\s*=\s*(''|"")/.test(read(file)),
        `${file} does not set the row thumbnail alt to an empty string. Rule: ${GUIDE}, Invariants row 5.`
      );
    });
  }

  for (const file of TEMPLATE_ROW_BUILDERS) {
    test(`${file}: each <img> has alt=""`, () => {
      for (const { tag, line } of imgTags(file)) {
        assert.ok(
          /\salt=""/.test(tag),
          `${file}:${line} has a row thumbnail whose alt is not empty. Rule: ${GUIDE}, Invariants row 5.`
        );
      }
    });
  }
});

// ── Row 6: dynamic figures are numbered ──────────────────────────────────────

describe(`${GUIDE} row 6: pages that render figures call numberFigures()`, () => {
  // A top-level script that imports content-markers.js renders [figure] markers.
  const figureRenderers = sourceFiles.filter(
    (file) =>
      path.posix.dirname(file) === JS_DIR && file.endsWith(".js") && /content-markers/.test(read(file))
  );

  test("finds the scripts that render figures", () => {
    assert.ok(figureRenderers.length > 0, `No script under ${JS_DIR}/ imports content-markers.`);
  });

  for (const file of figureRenderers) {
    test(`${file} imports and calls numberFigures()`, () => {
      const text = read(file);
      assert.ok(
        /import \{[^}]*\bnumberFigures\b[^}]*\} from/.test(text) && /\bnumberFigures\(/.test(text),
        `${file} renders figures but does not import and call numberFigures(). Figures get no number. Rule: ${GUIDE}, Invariants row 6.`
      );
    });
  }
});

// ── Shape: the three news-blog-row builders share their markup ───────────────

describe(`${GUIDE} shape: the news-blog-row builders match`, () => {
  for (const file of DOM_ROW_BUILDERS) {
    test(`${file} writes every shared row class`, () => {
      const text = read(file);
      for (const className of SHARED_ROW_CLASSES) {
        assert.ok(
          new RegExp(`['"\` ]${className}['"\` ]`).test(text),
          `${file} does not write the class ${className}. Change the markup in all three news-blog-row builders together. Rule: ${GUIDE}, Shape.`
        );
      }
    });
  }
});
