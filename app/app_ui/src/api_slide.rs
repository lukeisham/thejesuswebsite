use app_core::types::system::pttx::SlideDeckPayload;
use axum::{http::StatusCode, response::IntoResponse, Json};
use bytes::Bytes;
use std::io::{Cursor, Write};
use zip::{write::SimpleFileOptions, ZipWriter};

// START handle_export_slide
/// Accepts a SlideDeckPayload JSON body, generates a .pptx file in memory,
/// and returns it as a binary download.
///
/// The PPTX is built as a valid OpenXML ZIP archive.
/// Slide structure:
///   - Slide 0: Cover slide with deck_title
///   - Slides 1..N: One slide per SlidePayload entry (heading + content_blocks)
pub async fn handle_export_slide(
    Json(payload): Json<SlideDeckPayload>,
) -> impl IntoResponse {
    match build_pptx(&payload) {
        Ok(bytes) => (
            StatusCode::OK,
            [
                (
                    "Content-Type",
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                ),
                (
                    "Content-Disposition",
                    "attachment; filename=\"slides.pptx\"",
                ),
            ],
            bytes,
        )
            .into_response(),
        Err(e) => {
            tracing::error!("[slide_export] Failed to build PPTX: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to generate PPTX: {}", e))
                .into_response()
        }
    }
}
// END handle_export_slide

// ---------------------------------------------------------------------------
// PPTX Generation
// ---------------------------------------------------------------------------

/// Builds a minimal but spec-compliant .pptx in memory.
/// Returns raw bytes ready to stream to the browser.
fn build_pptx(deck: &SlideDeckPayload) -> Result<Bytes, Box<dyn std::error::Error>> {
    let buf = Cursor::new(Vec::new());
    let mut zip = ZipWriter::new(buf);
    let opts = SimpleFileOptions::default();

    // Collect all slides: cover first, then each payload slide
    let mut all_slides: Vec<SlideXml> = Vec::new();
    all_slides.push(SlideXml {
        title: deck.deck_title.clone(),
        body_lines: vec![],
        is_cover: true,
    });
    for s in &deck.slides {
        all_slides.push(SlideXml {
            title: s.heading.clone(),
            body_lines: s.content_blocks.clone(),
            is_cover: false,
        });
    }

    let slide_count = all_slides.len();

    // 1. [Content_Types].xml
    zip.start_file("[Content_Types].xml", opts)?;
    zip.write_all(build_content_types(slide_count).as_bytes())?;

    // 2. _rels/.rels
    zip.start_file("_rels/.rels", opts)?;
    zip.write_all(ROOT_RELS.as_bytes())?;

    // 3. ppt/presentation.xml
    zip.start_file("ppt/presentation.xml", opts)?;
    zip.write_all(build_presentation_xml(slide_count).as_bytes())?;

    // 4. ppt/_rels/presentation.xml.rels
    zip.start_file("ppt/_rels/presentation.xml.rels", opts)?;
    zip.write_all(build_presentation_rels(slide_count).as_bytes())?;

    // 5. ppt/slideLayouts/slideLayout1.xml + _rels
    zip.start_file("ppt/slideLayouts/slideLayout1.xml", opts)?;
    zip.write_all(SLIDE_LAYOUT.as_bytes())?;
    zip.start_file("ppt/slideLayouts/_rels/slideLayout1.xml.rels", opts)?;
    zip.write_all(SLIDE_LAYOUT_RELS.as_bytes())?;

    // 6. ppt/slideMasters/slideMaster1.xml + _rels
    zip.start_file("ppt/slideMasters/slideMaster1.xml", opts)?;
    zip.write_all(SLIDE_MASTER.as_bytes())?;
    zip.start_file("ppt/slideMasters/_rels/slideMaster1.xml.rels", opts)?;
    zip.write_all(SLIDE_MASTER_RELS.as_bytes())?;

    // 7. Per-slide XML and rels
    for (i, slide) in all_slides.iter().enumerate() {
        let slide_idx = i + 1;

        zip.start_file(format!("ppt/slides/slide{}.xml", slide_idx), opts)?;
        zip.write_all(build_slide_xml(slide).as_bytes())?;

        zip.start_file(
            format!("ppt/slides/_rels/slide{}.xml.rels", slide_idx),
            opts,
        )?;
        zip.write_all(SLIDE_RELS.as_bytes())?;
    }

    let finished = zip.finish()?;
    Ok(Bytes::from(finished.into_inner()))
}

// ---------------------------------------------------------------------------
// Internal slide generation helpers
// ---------------------------------------------------------------------------

struct SlideXml {
    title: String,
    body_lines: Vec<String>,
    is_cover: bool,
}

/// Generates the OpenXML for a single slide.
fn build_slide_xml(slide: &SlideXml) -> String {
    let title_xml = escape_xml(&slide.title);

    // For the cover slide: just a large centred title, no body
    let body_xml = if slide.is_cover {
        String::new()
    } else {
        let runs: String = slide
            .body_lines
            .iter()
            .map(|line| {
                format!(
                    "<a:p><a:r><a:rPr lang=\"en-US\" dirty=\"0\"/><a:t>{}</a:t></a:r></a:p>",
                    escape_xml(line)
                )
            })
            .collect::<Vec<_>>()
            .join("\n");

        format!(
            r#"<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="3" name="Body"/>
    <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr><p:ph idx="1"/></p:nvPr>
  </p:nvSpPr>
  <p:spPr/>
  <p:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    {}
  </p:txBody>
</p:sp>"#,
            runs
        )
    };

    format!(
        r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>
        <a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="title"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>{title}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      {body}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>"#,
        title = title_xml,
        body = body_xml
    )
}

/// XML-escapes a string for embedding into XML attribute/text content.
fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

// ---------------------------------------------------------------------------
// Dynamic XML builders (depend on slide count)
// ---------------------------------------------------------------------------

fn build_content_types(slide_count: usize) -> String {
    let slide_overrides: String = (1..=slide_count)
        .map(|i| {
            format!(
                r#"  <Override PartName="/ppt/slides/slide{i}.xml"
    ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>"#
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml"
    ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml"
    ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml"
    ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
{slide_overrides}
</Types>"#
    )
}

fn build_presentation_xml(slide_count: usize) -> String {
    let slide_ids: String = (1..=slide_count)
        .map(|i| {
            format!(
                r#"      <p:sldId id="{id}" r:id="rId{i}"/>"#,
                id = 255 + i,
                i = i
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                saveSubsetFonts="1">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rIdMaster"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
{slide_ids}
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000" type="screen4x3"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>"#
    )
}

fn build_presentation_rels(slide_count: usize) -> String {
    let slide_rels: String = (1..=slide_count)
        .map(|i| {
            format!(
                r#"  <Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i}.xml"/>"#
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
{slide_rels}
  <Relationship Id="rIdMaster" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
</Relationships>"#
    )
}

// ---------------------------------------------------------------------------
// Static XML fragments (not dependent on slide count)
// ---------------------------------------------------------------------------

const ROOT_RELS: &str = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>"#;

const SLIDE_RELS: &str = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>"#;

const SLIDE_LAYOUT: &str = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
             xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             type="blank" preserve="1">
  <p:cSld name="Blank"><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>
      <a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
  </p:spTree></p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>"#;

const SLIDE_LAYOUT_RELS: &str = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>"#;

const SLIDE_MASTER: &str = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
             xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>
      <a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
  </p:spTree></p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1"
            accent2="accent2" accent3="accent3" accent4="accent4"
            accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle><a:lstStyle/></p:titleStyle>
    <p:bodyStyle><a:lstStyle/></p:bodyStyle>
    <p:otherStyle><a:lstStyle/></p:otherStyle>
  </p:txStyles>
</p:sldMaster>"#;

const SLIDE_MASTER_RELS: &str = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>"#;
