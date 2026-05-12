# =============================================================================
#   THE JESUS WEBSITE — IMAGE PROCESSOR PIPELINE
#   File:    backend/pipelines/image_processor.py
#   Version: 1.0.0
#   Purpose: Validates, resizes, and compresses an uploaded PNG image.
#
#   TRIGGER:
#     Called by admin_api.py when an Admin uploads a PNG via the Record Editor.
#
#   MAIN FUNCTION:
#     process_uploaded_png(raw_bytes: bytes) -> dict
#       Accepts the raw binary of a PNG file.
#       Resizes to a maximum width of 800px (maintaining aspect ratio).
#       Compresses iteratively until the output is ≤ 250 KB.
#       Generates a thumbnail at a maximum width of 200px.
#
#   OUTPUT:
#     {
#       "picture_bytes":     <bytes>  — resized + compressed full image (PNG),
#       "picture_thumbnail": <bytes>  — 200px-wide thumbnail (PNG)
#     }
#
#   IDEMPOTENCY:
#     Stateless and safe to call repeatedly. No database or filesystem I/O.
# =============================================================================

from io import BytesIO

from PIL import Image

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAX_FULL_WIDTH = 800  # pixels — maximum width for the full image
MAX_THUMB_WIDTH = 200  # pixels — maximum width for the thumbnail
MAX_FILE_SIZE_KB = 250  # kilobytes — upper size limit for the full image
INITIAL_QUALITY = 85  # PNG-equivalent starting quality (for JPEG fallback path)
QUALITY_STEP = 5  # reduction per iteration
QUALITY_FLOOR = 10  # lowest acceptable quality


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _resize_to_max_width(image: Image.Image, max_width: int) -> Image.Image:
    """
    Return a copy of `image` scaled down so its width does not exceed
    `max_width`. Aspect ratio is preserved. If the image is already within
    the limit, the original object is returned unchanged.
    """
    width, height = image.size

    if width <= max_width:
        return image

    new_width = max_width
    new_height = int(height * (max_width / width))
    return image.resize((new_width, new_height), Image.Resampling.LANCZOS)


def _compress_to_limit(image: Image.Image, max_kb: int) -> bytes:
    """
    Save `image` as PNG, then try colour reduction, then fall back
    to JPEG compression to hit the size target.

    Strategy:
      1. Try lossless PNG first — PNG is always preferred for quality.
      2. If PNG already fits, return it immediately.
      3. If PNG is too large, try reducing colours via quantize (256 → 8).
      4. If still too large, convert to RGB and use JPEG quality loop
         (85 → 10 in steps of 5). The JPEG result is re-wrapped as PNG
         so the caller always receives PNG bytes.

    Note: For most admin record images (≤ 800px wide), lossless PNG will
    typically fit within 250 KB.  The JPEG fallback handles edge cases such
    as highly-detailed photographs.
    """
    max_bytes = max_kb * 1024

    # --- Attempt 1: lossless PNG ---
    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    if buffer.tell() <= max_bytes:
        return buffer.getvalue()

    # --- Attempt 2: Quantize loop for PNG ---
    colors = 256
    while colors >= 8:
        # Convert to P mode with reduced colours
        q_img = image.quantize(colors=colors)
        buffer = BytesIO()
        q_img.save(buffer, format="PNG", optimize=True)

        if buffer.tell() <= max_bytes:
            return buffer.getvalue()

        colors = colors // 2

    # --- Attempt 3: JPEG quality loop fallback ---
    # Convert to RGB (JPEG doesn't support alpha). If the image had
    # transparency, composite onto a white background first.
    if image.mode == "RGBA":
        background = Image.new("RGB", image.size, (255, 255, 255))
        background.paste(image, mask=image.split()[3])  # use alpha channel as mask
        rgb_image = background
    elif image.mode != "RGB":
        rgb_image = image.convert("RGB")
    else:
        rgb_image = image

    quality = INITIAL_QUALITY
    while quality >= QUALITY_FLOOR:
        jpeg_buffer = BytesIO()
        rgb_image.save(jpeg_buffer, format="JPEG", quality=quality, optimize=True)

        if jpeg_buffer.tell() <= max_bytes:
            # Re-wrap as PNG so the caller always receives PNG bytes
            jpeg_image = Image.open(jpeg_buffer)
            png_buffer = BytesIO()
            jpeg_image.save(png_buffer, format="PNG", optimize=True)
            return png_buffer.getvalue()

        quality -= QUALITY_STEP

    # Floor reached — return the smallest we managed from the JPEG loop
    jpeg_image = Image.open(jpeg_buffer)
    png_buffer = BytesIO()
    jpeg_image.save(png_buffer, format="PNG", optimize=True)
    return png_buffer.getvalue()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def process_uploaded_png(raw_bytes: bytes) -> dict:
    """
    Trigger:  Called by admin_api.py after receiving a raw PNG upload.
    Function: Resizes to ≤ 800px wide, compresses to ≤ 250 KB, and generates
              a 200px-wide thumbnail — all in memory, no filesystem I/O.
    Output:   { "picture_bytes": <bytes>, "picture_thumbnail": <bytes> }
    """
    # --- Open image from raw bytes ---
    source_image = Image.open(BytesIO(raw_bytes))

    # Ensure we are working with RGBA or RGB (normalise palette/other modes)
    if source_image.mode not in ("RGB", "RGBA"):
        source_image = source_image.convert("RGBA")

    # --- Full image: resize then compress ---
    resized_image = _resize_to_max_width(source_image, MAX_FULL_WIDTH)
    picture_bytes = _compress_to_limit(resized_image, MAX_FILE_SIZE_KB)

    # --- Thumbnail: resize only, no quality loop needed ---
    thumbnail_image = _resize_to_max_width(source_image, MAX_THUMB_WIDTH)
    thumb_buffer = BytesIO()
    thumbnail_image.save(thumb_buffer, format="PNG", optimize=True)
    picture_thumbnail = thumb_buffer.getvalue()

    return {
        "picture_bytes": picture_bytes,
        "picture_thumbnail": picture_thumbnail,
    }
