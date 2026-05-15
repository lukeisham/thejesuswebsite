---
name: guide_dashboard_appearance.md
purpose: ASCII wireframes of the two admin dashboard views for the 2.0 Records Module — All Records table and Single Record editor
version: 2.0.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, guide_frontend_appearance.md, guide_function.md, records_nomenclature.md]
---

# 2.0 Records Module — Dashboard Appearance

## All Records View (`dashboard_records_all.js`)

```text
+====================================================================================================+
| [logo] Jesus Website Dashboard          < Return to Frontpage | Dashboard | Logout >               |
+====================================================================================================+
| Sort:   [Creation Date] [Unique ID] [Primary Verse] [Title] [List Ord.] [Bulk]                     |
| Status: [All] [Published] [Draft]                                              [+ New Record]      |
+----------------------------------------------------------------------------------------------------+
| Search: [________________________________________________] (Cmd+K)  [x clear]   "3 results"       |
+----------------------------------------------------------------------------------------------------+
| Upload CSV: [ Choose File ]                                                                        |
+====================================================================================================+
|                                                                                                    |
|  -- DEFAULT TABLE (any sort toggle except Bulk) ------------------------------------               |
|                                                                                                    |
|  Title               | Primary Verse    | Snippet                        | Status                  |
|  --------------------+------------------+--------------------------------+-------------------------|
|  Jesus is born       | Luke 2:1-7       | In those days Caesar Aug...    | Published               |
|  Sermon on Mount     | Matthew 5:3      | Seeing the crowds, he we...    | Published               |
|  Draft Item 1        |                  | Pending content...             | Draft                   |
|  ...                 | ...              | ...                            | ...                     |
|                                                                                                    |
|  (rows clickable -> opens Single Record editor)                                                    |
|  [ scroll sentinel — triggers next 50-row batch via Intersection Observer ]                        |
|                                                                                                    |
+====================================================================================================+
|                                                                                                    |
|  -- BULK REVIEW PANEL (replaces table when Bulk toggle active) -----------------                   |
|                                                                                                    |
|  +================================================================================================+
|  |  Bulk Upload Review -- 12 parsed, 10 valid, 2 errors     [Save as Draft]  [Discard All]        |
|  +------------------------------------------------------------------------------------------------+
|  |  [x] | Row | Title               | Primary Verse    | Validation                               |
|  |  ----+-----+---------------------+------------------+-----------------------------------------|
|  |  [x] |  1  | Jesus is born       | Luke 2:1-7       | valid                                    |
|  |  [x] |  2  | Sermon on Mount     | Matthew 5:3      | valid                                    |
|  |  [ ] |  3  |                     |                  | invalid: missing title                   |
|  |  [x] |  4  | Baptism of Jesus    | Mark 1:9-11      | valid                                    |
|  |  ...                                                                                           |
|  +================================================================================================+
|                                                                                                    |
+====================================================================================================+
```

## Single Record Editor (`dashboard_records_single.js`)

```text
+====================================================================================================+
| [logo] Jesus Website Dashboard          < Return to Frontpage | Dashboard | Logout >               |
+====================================================================================================+
| Function Bar:                    [ Save Draft ]   [ Publish ]   [ Delete ]                         |
+====================================================================================================+
|                                                                                                    |
|  +-- SECTION NAV (sticky) -----------------------------------------------------------------------+ |
|  | [Core IDs] [Images] [Description] [Taxonomy] [Verses] [External Refs] [Metadata & Status]    | |
|  +-----------------------------------------------------------------------------------------------+ |
|                                                                                                    |
|  == CORE IDENTIFIERS ============================================================================= |
|                                                                                                    |
|  Unique ID (ULID):    [01HXYZ...]  (read-only)                                                    |
|  Title:               [________________________________________]                                   |
|  Slug:                [________________________________________]                                   |
|                                                                                                    |
|  == IMAGES ======================================================================================== |
|                                                                                                    |
|  Picture Name:        [________________________________________]                                   |
|  +------------------+  +------------------+                                                        |
|  | Image Preview    |  | Thumbnail        |                                                        |
|  | (max 800px)      |  | (max 200px)      |                                                        |
|  +------------------+  +------------------+                                                        |
|  [ Upload Picture ] (PNG only)                                                                     |
|                                                                                                    |
|  == DESCRIPTION =================================================================================== |
|                                                                                                    |
|  Description:                                                                                      |
|  +------------------------------------------------------------------------------------------------+|
|  | Paragraph 1: [_____________________________________________________________]  [x]             ||
|  | Paragraph 2: [_____________________________________________________________]  [x]             ||
|  | Paragraph 3: [_____________________________________________________________]  [x]             ||
|  |                              [ + Add Paragraph ]                                               ||
|  +------------------------------------------------------------------------------------------------+|
|                                                                                                    |
|  Snippet:                                                                                          |
|  +------------------------------------------------------------------------------------------------+|
|  | Paragraph 1: [_____________________________________________________________]  [x]             ||
|  |                              [ + Add Paragraph ]                                               ||
|  +------------------------------------------------------------------------------------------------+|
|                                                                                                    |
|  == TAXONOMY ====================================================================================== |
|                                                                                                    |
|  Era:               [PreIncarnation|OldTestament|EarlyLife|Life|GalileeMinistry|                    |
|                       JudeanMinistry|PassionWeek|Post-Passion v]                                   |
|                                                                                                    |
|  Timeline:          [PreIncarnation|OldTestament|EarlyLifeUnborn|EarlyLifeBirth|                    |
|                       EarlyLifeInfancy|EarlyLifeChildhood|LifeTradie|LifeBaptism|                   |
|                       LifeTemptation|GalileeCallingTwelve|GalileeSermonMount|                       |
|                       GalileeMiraclesSea|GalileeTransfiguration|JudeanOutsideJudea|                 |
|                       JudeanMissionSeventy|JudeanTeachingTemple|JudeanRaisingLazarus|               |
|                       JudeanFinalJourney|PassionPalmSunday|PassionMondayCleansing|                  |
|                       PassionTuesdayTeaching|PassionWednesdaySilent|PassionMaundyThursday|          |
|                       PassionMaundyLastSupper|PassionMaundyGethsemane|PassionMaundyBetrayal|        |
|                       PassionFridaySanhedrin|PassionFridayCivilTrials|                              |
|                       PassionFridayCrucifixionBegins|PassionFridayDarkness|                         |
|                       PassionFridayDeath|PassionFridayBurial|PassionSaturdayWatch|                  |
|                       PassionSundayResurrection|PostResurrectionAppearances|                        |
|                       Ascension|OurResponse|ReturnOfJesus v]                                       |
|                                                                                                    |
|  Gospel Category:   [event|location|person|theme|object v]                                         |
|                                                                                                    |
|  Map Label:         [Overview|Empire|Levant|Judea|Galilee|Jerusalem|Supernatural|Spiritual v]      |
|                                                                                                    |
|  Geo ID:            [____] (integer 0-999)                                                         |
|                                                                                                    |
|  Parent ID:         [________________________] (ULID of parent record)                             |
|                      hint: "Resolved: The Crucifixion"                                             |
|                                                                                                    |
|  == VERSES ======================================================================================== |
|                                                                                                    |
|  Primary Verse:                                                                                    |
|  +------------------------------------------------------------------------------------------------+|
|  | Book: [Genesis v]  Chapter: [__]  Verse: [__]  [ + Add ]                                      ||
|  | Chips: (Matthew 5:3 [x])                                                                      ||
|  +------------------------------------------------------------------------------------------------+|
|                                                                                                    |
|  Secondary Verses:                                                                                 |
|  +------------------------------------------------------------------------------------------------+|
|  | Book: [Genesis v]  Chapter: [__]  Verse: [__]  [ + Add ]                                      ||
|  | Chips: (Luke 2:7 [x]) (John 3:16 [x])                                                        ||
|  +------------------------------------------------------------------------------------------------+|
|                                                                                                    |
|  == EXTERNAL REFERENCES =========================================================================== |
|                                                                                                    |
|  Bibliography (MLA):                                                                               |
|  +------------------------------------------------------------------------------------------------+|
|  | Books:    Author | Title | Publisher | Year | Pages          [+ Add Book]       [x]            ||
|  | Articles: Author | Title | Journal | Volume | Year | Pages  [+ Add Article]    [x]            ||
|  | Websites: Author | Title | URL | Accessed Date              [+ Add Website]   [x]            ||
|  +------------------------------------------------------------------------------------------------+|
|                                                                                                    |
|  Context Links:                                                                                    |
|  +------------------------------------------------------------------------------------------------+|
|  | Slug                 | Type            |                                                       ||
|  | jesus-baptism        | record     [x]  |  slug: [______] type: [rec|ess|blog v] [+]           ||
|  +------------------------------------------------------------------------------------------------+|
|                                                                                                    |
|  Unique Identifiers:                                                                               |
|  | IAA Reference:        [________________________________________]                                |
|  | Pledius Reference:    [________________________________________]                                |
|  | Manuscript Reference: [________________________________________]                                |
|                                                                                                    |
|  == METADATA & STATUS ============================================================================= |
|                                                                                                    |
|  Metadata Widget:                                                                                  |
|  | URL Slug:   [auto-generated-or-manual]  [GENERATE]                                              |
|  | Snippet:    [2-3 sentence summary...]   [GENERATE]                                              |
|  | Keywords:   (jesus [x]) (history [x])   [GENERATE]                [GENERATE ALL]                |
|                                                                                                    |
|  Created At:  [2024-01-15T10:30:00Z]  (read-only)                                                 |
|  Updated At:  [2024-03-22T14:15:00Z]  (auto-set on save)                                          |
|                                                                                                    |
|  Status:      ( ) Draft    ( ) Published                                                           |
|                                                                                                    |
+====================================================================================================+
```
