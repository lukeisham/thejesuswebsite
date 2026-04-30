// =============================================================================
//
//   THE JESUS WEBSITE — PICTURES DISPLAY DYNAMIC LOADER
//   File:    js/2.0_records/frontend/pictures_display.js
//   Version: 1.1.0
//   Purpose: Listens for the recordMainRendered event, fetches picture BLOBs
//            if available, and renders the framed picture matching Guide §1.7.
//   Source:  guide_appearance.md §1.7, vibe_coding_rules.md §2
//
// =============================================================================

function convertBlobToUrl(uint8Array) {
    if (!uint8Array || !(uint8Array instanceof Uint8Array)) {
        return null;
    }
    var blob = new Blob([uint8Array], { type: 'image/png' }); // assumes PNG as per schema
    return URL.createObjectURL(blob);
}

document.addEventListener('recordMainRendered', function(event) {
    var record = event.detail.record;
    var pictureContainer = document.getElementById('record-picture-container');
    
    if (!pictureContainer) return;

    if (record.picture_bytes && record.picture_bytes.length > 0) {
        try {
            var imageUrl = convertBlobToUrl(record.picture_bytes);
            if (!imageUrl) throw new Error("Invalid object array");
            
            var pictureName = record.picture_name || 'Picture';

            var html = [
                '<div class="picture-frame">',
                '    <img src="' + imageUrl + '" alt="' + pictureName + '" class="record-picture" />',
                '</div>',
                '<div class="picture-label">',
                '    ' + pictureName,
                '</div>'
            ].join('\n');

            pictureContainer.innerHTML = html;
            pictureContainer.classList.add('is-visible-flex');
            pictureContainer.classList.remove('is-hidden');
        } catch (error) {
            console.error('[pictures_display.js] Failed to render picture:', error);
            pictureContainer.classList.add('is-hidden');
            pictureContainer.classList.remove('is-visible-flex');
        }
    } else {
        pictureContainer.classList.add('is-hidden');
        pictureContainer.classList.remove('is-visible-flex');
    }
});
