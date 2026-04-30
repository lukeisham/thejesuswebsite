// =============================================================================
//
//   THE JESUS WEBSITE — JSON-LD STRUCTURED DATA BUILDER
//   File:    js/2.0_records/frontend/json_ld_builder.js
//   Version: 1.0.0
//   Purpose: Dynamically injects Schema.org metadata for rich SEO snippets.
//
// =============================================================================

// Trigger: Called by single_view.js or header.js once data is loaded.
// Action: Constructs a valid JSON-LD object and appends to <head>.
// Output: Invisible <script type="application/ld+json"> node for Search Engines.

window.injectJsonLd = function (recordData, schemaType = "HistoricalEvent") {
  if (!recordData) return;

  // Remove existing JSON-LD if navigating cleanly between SPA views
  const existingScript = document.getElementById("dynamic-json-ld");
  if (existingScript) {
    existingScript.remove();
  }

  const baseUrl = "https://www.thejesuswebsite.com";
  const currentUrl = `${baseUrl}/record/${recordData.slug || ""}`;

  // Map internal SQLite structure to standard Schema.org protocols
  const schemaObj = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: recordData.title || "Untitled Record",
    description: recordData.description || "Historical archive dataset.",
    url: currentUrl,
    temporalCoverage: recordData.era || "1st Century",
    publisher: {
      "@type": "Organization",
      name: "The Jesus Website",
      url: baseUrl,
    },
  };

  // If it's authored content (Essays/Responses), flag it as an Article
  if (schemaType === "Article") {
    schemaObj.headline = recordData.title;
    // Typically Date inputs might map to datePublished
    schemaObj.datePublished = recordData.updated_at || "2026-01-01";

    // Map bibliography references as citations
    try {
      if (recordData.bibliography) {
        const biblioArr = JSON.parse(recordData.bibliography);
        schemaObj.citation = biblioArr.map((b) => b.citation_text);
      }
    } catch (e) {
      console.error("JSON-LD: Could not parse bibliography details.", e);
    }
  }

  // Build the script payload
  const scriptTag = document.createElement("script");
  scriptTag.type = "application/ld+json";
  scriptTag.id = "dynamic-json-ld";
  scriptTag.text = JSON.stringify(schemaObj, null, 2);

  // Inject into document DOM
  document.head.appendChild(scriptTag);
};
