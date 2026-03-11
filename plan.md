# Save to Slide Feature Implementation Plan

## Overview
This plan outlines the steps required to activate the "Export to Slide" button in the footer. The process involves creating new frontend scripts to strip raw HTML into simple text and ASCII equivalents, logically breaking up continuous web content into distinct slides based on the page's URL context, and defining a rigorous payload structure on the Rust backend for PPTX generation.

## Step 1: HTML to ASCII / Plain Text Converter (`html_to_ascii.js`)
We will create a new helper JavaScript module (`frontend/js/html_to_ascii.js`).
This script will:
- Accept raw DOM nodes or HTML strings and strip away all formatting, images, and script tags.
- When it encounters complex structural elements (like multi-column CSS grids or tables), it should attempt to generate simple ASCII diagrams/tables as a fallback so the slide content remains universally readable without HTML.

## Step 2: Content Slicing & Extraction (`save_to_slide.js`)
We will create the core extractor script (`frontend/js/save_to_slide.js`).
1. **Targeting the Cover Slide**: It will scan the main content area for the highest-ranked heading (e.g., `<h1>` or `<h2>`) to use as the title/cover slide.
2. **URL Context Chunking**: It will analyze `window.location.pathname` to determine the slide divider logic. For standard list pages, it configures `<h3>` as the break point. For essay pages, it dynamically chooses `<h4>` or `<h5>`.
3. **Slide Assembly**: It will iterate through the DOM linearly. Whenever the divider heading is hit, a new Slide object begins. All content beneath it is passed through `html_to_ascii.js` and collected until the next heading.
4. **JSON Export**: It bundles this into the final payload structure matching the backend expected types.

## Step 3: API Request Integration (`footer_actions.js`)
We will update `frontend/js/footer_actions.js`:
- Override the `saveAsSlide()` dummy implementation.
- Call the extractor to get the deck JSON.
- `fetch()` with method `POST` to the backend generator route.
- Await the binary response and programmatically prompt the user to download the generated `.pptx` file.

## Step 4: Backend Struct Definition (`pttx.rs`)
We will expand `app/app_core/src/types/system/pttx.rs` to officially define the incoming JSON structure:
- Define `SlidePayload`:
  - `heading: String`
  - `content_blocks: Vec<String>` (The ASCII/Text chunks)
- Define `SlideDeckPayload`:
  - `deck_title: String`
  - `slides: Vec<SlidePayload>`
  - `generated_at: DateTime<Utc>`

## Step 5: Backend API Handler
A backend route will be modified/created to receive `SlideDeckPayload` and process the OpenXML `.pptx` generation before returning the binary stream.
