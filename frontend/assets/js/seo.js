/**
 * SEO helper: updates <title>, meta tags, OG tags, and JSON-LD script blocks.
 *
 * Called on every page load and client-side navigation.
 *
 * @module seo
 */

const OG_PROPERTIES = {
  title: 'og:title',
  description: 'og:description',
  ogImage: 'og:image',
};

/**
 * Update page metadata for SEO.
 *
 * @param {Object} options
 * @param {string} [options.title] - Sets <title> and og:title.
 * @param {string} [options.description] - Sets description and og:description.
 * @param {string} [options.ogImage] - Full URL to the Open Graph image.
 * @param {Object|Object[]} [options.jsonLd] - One or more JSON-LD objects.
 *
 * @example
 * setSEO({
 *   title: 'Evidence — The Jesus Website',
 *   description: 'Explore the historical evidence for Jesus of Nazareth.',
 * });
 */
export function setSEO({ title, description, ogImage, jsonLd } = {}) {
  if (title && typeof title === 'string') {
    document.title = title;
    setMetaProperty(OG_PROPERTIES.title, title);
  }

  if (description && typeof description === 'string') {
    setMeta('description', description);
    setMetaProperty(OG_PROPERTIES.description, description);
  }

  if (ogImage && typeof ogImage === 'string') {
    setMetaProperty(OG_PROPERTIES.ogImage, ogImage);
  }

  if (jsonLd) {
    injectJsonLd(jsonLd);
  }
}

/**
 * Set or update a `<meta name="..." content="...">` tag.
 *
 * @param {string} name
 * @param {string} content
 */
function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Set or update a `<meta property="..." content="...">` tag.
 *
 * @param {string} property
 * @param {string} content
 */
function setMetaProperty(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Inject or replace JSON-LD structured data scripts into the <head>.
 *
 * @param {Object|Object[]} data - One or more JSON-LD objects.
 */
function injectJsonLd(data) {
  // Remove previous JSON-LD scripts
  document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove());

  const items = Array.isArray(data) ? data : [data];

  items.forEach((item) => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(item);
    document.head.appendChild(script);
  });
}
