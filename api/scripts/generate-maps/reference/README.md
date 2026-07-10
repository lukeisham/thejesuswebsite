# Jerusalem Map Reference Assets

Tracing references used to author the `api/scripts/generate-maps/overlays/jerusalem.svg` overlay. These files are **not** embedded in the generated SVG — they are visual references for the human/agent tracing the overlay paths.

## Files

### britannica-1911-jerusalem.jpg

- **Source**: Encyclopaedia Britannica, 11th Edition (1911), Volume 15, "Jerusalem" article, Plate I — "Plan of Jerusalem"
- **URL**: https://commons.wikimedia.org/wiki/File:EB1911_-_Plan_of_Jerusalem.jpg
- **Licence**: Public domain (published before 1931, copyright expired worldwide).
- **Usage**: Traced for the First Wall, Second Wall, Temple Mount platform, Antonia Fortress, Herod's Palace, City of David outline, and Golgotha marker geometry. Shapes are projected into the generator's bbox coordinate space so geo-anchored pins land correctly.

### openbible-jerusalem-topography.jpg

- **Source**: OpenBible.info Jerusalem natural-topography overlay
- **URL**: https://www.openbible.info/geo/ (see "Overlays" section — Google Earth overlays showing ancient/modern Jerusalem topography on satellite imagery)
- **Licence**: CC BY 4.0 (Creative Commons Attribution 4.0 International)
- **Usage**: Traced for Kidron Valley course, Hinnom Valley course, Mount of Olives ridgeline, and western-hill ridgelines. Attribution is rendered on the Jerusalem map per CC BY 4.0 licence requirements.

### jerusalem-places.geojson

- **Source**: Bible-Geocoding-Data by OpenBible.info
- **URL**: https://github.com/openbibleinfo/Bible-Geocoding-Data
- **Repository licence**: CC BY 4.0
- **Usage**: Lat/lng coordinates for Second-Temple-period Jerusalem place points (Temple Mount, Golgotha, Gethsemane, City of David, Herod's Palace, etc.) used to verify that overlay geometry is correctly positioned relative to geo-anchored pins.

## To download the reference images

### Britannica 1911 Plan

```sh
# Direct Wikimedia Commons download (if the exact file path is confirmed):
curl -L -o britannica-1911-jerusalem.jpg \
  "https://upload.wikimedia.org/wikipedia/commons/.../EB1911_-_Plan_of_Jerusalem.jpg"
```

If the Wikimedia Commons URL has changed, search "Plan of Jerusalem Britannica 1911" on Wikimedia Commons and download the highest-resolution version.

### OpenBible Topography

The OpenBible.info topography overlay is available as a Google Earth KMZ overlay from:
https://www.openbible.info/geo/

Open in Google Earth, export the relevant Jerusalem-area view as a screenshot, and save as `openbible-jerusalem-topography.jpg`.

## Licence compliance

- Britannica 1911: Public domain. No attribution required, but credit is included as a courtesy ("Plan after Britannica 1911" in the map attribution line).
- OpenBible.info topography: CC BY 4.0 — attribution text rendered on the Jerusalem map per licence requirement.
- Bible-Geocoding-Data: CC BY 4.0 — used only as a coordinate reference (not embedded), attribution included.
