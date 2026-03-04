/**
 * Integration Demo: Rust System Types in JavaScript
 * 
 * This script demonstrates how the frontend will interact with the WASM-exported 
 * types from app_core/src/types/system.
 */

async function demoInterop() {
    // 1. Importing the WASM module (standard wasm-bindgen pattern)
    const wasm = await import('./pkg/app_core.js');
    await wasm.default();

    try {
        console.log("--- Phase 3: Brain/Gatekeeper Exports (System) ---");

        // 2. Generating a ULID (Async constructor)
        const ulid = await wasm.UlidNumber.generate();
        console.log("Generated ULID:", ulid.to_string());

        // 3. Creating Metadata (Async Gatekeeper validation)
        const validMetadata = await wasm.Metadata.try_new(
            ["history", "archaeology", "levant"],
            wasm.EntryToggle.Record
        );
        console.log("Metadata Created Successfully:", validMetadata.id.to_string());

        console.log("--- Phase 8: Domain Brain/Gatekeeper Exports ---");

        // 4. Contact & Mission
        // Note: try_new is exported as a standard (non-async) Result-returning function in this case
        const contact = wasm.Contact.try_new("Luke Isham", "luke@example.com");
        console.log("Contact Validated:", contact.email);

        // 5. Financials (u64 -> BigInt)
        const budget = await wasm.Budget.try_new(100000n, 50000n); // 1000.00 total, 500.00 spent
        console.log("Budget Remaining:", budget.remaining_budget()); // returns BigInt

        // 6. Geographic & Interactive Maps
        const map = await wasm.InteractiveMap.new(wasm.MapType.Galilee);
        const point = {
            id: wasm.Uuid.new_v4(),
            title: "Capernaum",
            description: "Town of Jesus",
            latitude: 32.89,
            longitude: 35.57,
            metadata: new Map() // Special handling for HashMap might be needed via JsValue
        };
        // await map.add_point(point); 
        console.log("Map Initialized:", map.label);

        // 7. Research & Essays (Async Composing)
        const essay = await wasm.Essay.compose(
            "The Historical Jesus",
            "A breakdown of current scholarly consensus...",
            "Luke Isham",
            validMetadata
        );
        console.log("Essay Composed:", essay.title);

        // 8. Search Logic
        const domain = await wasm.SearchDomain.try_compose(
            "wikipedia.org",
            "Theology"
        );
        const word = await wasm.SearchWord.try_new("Sermon on the Mount");
        console.log("Search Context Ready:", word.as_str());

        // 9. Records Integration (Full Cycle)
        const record = await wasm.Record.try_new(
            validMetadata,
            "Mount of Beatitudes",
            new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // Mock PNG
            ["A beautiful hill in Galilee."],
            [],
            await wasm.TimelineEntry.new("Sermon", wasm.TimelineEra.Ministry),
            map,
            wasm.Classification.Location,
            await wasm.BibleVerse.new(wasm.BibleBook.Matthew, 5, 1),
            null
        );
        console.log("Record Full Object Created:", record.to_json());

        console.log("--- Interop Verification Complete ---");

    } catch (err) {
        console.error("Interop Failure (Gatekeeper Blocked):", err);
    }
}

// demoInterop();
