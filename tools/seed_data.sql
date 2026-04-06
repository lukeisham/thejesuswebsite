-- =============================================================================
--
--   THE JESUS WEBSITE — SEED DATA
--   File:    seed_data.sql
--   Version: 1.0.1
--   Purpose: Development sample dataset — 15 records spanning all gospel
--            categories, multiple eras/timelines, and diverse field coverage.
--   Source:  data_schema.md
--
--   All IDs are static ULIDs generated for deterministic development use.
--   INSERT OR IGNORE ensures this file is safe to run repeatedly.
--
-- =============================================================================


-- =============================================================================
-- SECTION 1: PERSONS
-- =============================================================================

INSERT OR IGNORE INTO records (
    id, title, slug, gospel_category, era, timeline,
    map_label, description, snippet,
    primary_verse, secondary_verse,
    bibliography, context_links,
    created_at, updated_at,
    users, page_views,
    wikipedia_title, wikipedia_rank,
    ordo_salutis
) VALUES (
    '01HZ0000000000000000000001',
    'Jesus of Nazareth',
    'jesus-of-nazareth',
    'person',
    'Life',
    'LifeBaptism',
    'Levant',
    '["Jesus of Nazareth is the central figure of the Christian faith, believed to be the Son of God and the promised Messiah of the Hebrew scriptures.", "Born in Bethlehem during the reign of Herod the Great, he grew up in Nazareth and began his public ministry around age 30 following his baptism by John.", "His ministry of teaching, healing, and miracle-working culminated in his crucifixion in Jerusalem and his resurrection three days later."]',
    '["The central figure of Christianity, Jesus of Nazareth lived in first-century Judea and proclaimed the Kingdom of God.", "His death and resurrection are the foundation of Christian salvation."]',
    '[{"book": "John", "chapter": 1, "verse": 14}]',
    '[{"book": "Isaiah", "chapter": 53, "verse": 3}]',
    '{"mla_book": "Wright, N.T. \\u003cem\\u003eJesus and the Victory of God\\u003c/em\\u003e. Fortress Press, 1996.", "mla_book_inline": "(Wright, 1996)", "mla_website": "", "mla_website_inline": ""}',
    '{"related": ["john-the-baptist", "bethlehem-birthplace", "baptism-of-jesus"]}',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Public',
    0,
    'Jesus',
    1
, NULL);

INSERT OR IGNORE INTO records (
    id, title, slug, gospel_category, era, timeline,
    map_label, description, snippet,
    primary_verse, secondary_verse,
    bibliography, context_links,
    created_at, updated_at,
    users, page_views,
    wikipedia_title, wikipedia_rank
) VALUES (
    '01HZ0000000000000000000002',
    'John the Baptist',
    'john-the-baptist',
    'person',
    'EarlyLife',
    'LifeBaptism',
    'Judea',
    '["John the Baptist was a Jewish prophet and the forerunner of Jesus, who prepared the way for the Messiah through a ministry of baptism and repentance.", "Born to Zechariah the priest and Elizabeth (a relative of Mary), John preached in the wilderness of Judea and baptised Jesus in the Jordan River.", "He was later imprisoned and executed by Herod Antipas at the request of Salome."]',
    '["The forerunner of Jesus, John the Baptist proclaimed repentance and prepared Israel for the arrival of the Messiah.", "He baptised Jesus in the Jordan River and was martyred for his prophetic boldness."]',
    '[{"book": "Matthew", "chapter": 3, "verse": 1}]',
    '[{"book": "Isaiah", "chapter": 40, "verse": 3}]',
    '{"mla_book": "Meier, John P. \\u003cem\\u003eA Marginal Jew: Rethinking the Historical Jesus, Vol. 2\\u003c/em\\u003e. Doubleday, 1994.", "mla_book_inline": "(Meier, 1994)"}',
    '{"related": ["baptism-of-jesus", "jesus-of-nazareth"]}',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Public',
    0,
    'John the Baptist',
    12
);

INSERT OR IGNORE INTO records (
    id, title, slug, gospel_category, era, timeline,
    map_label, description, snippet,
    primary_verse,
    bibliography,
    created_at, updated_at,
    users, page_views
) VALUES (
    '01HZ0000000000000000000003',
    'Mary, Mother of Jesus',
    'mary-mother-of-jesus',
    'person',
    'EarlyLife',
    'EarlyLifeUnborn',
    'Galilee',
    '["Mary was a Jewish woman from Nazareth who, according to Christian scripture, was the mother of Jesus Christ through a miraculous virgin conception by the Holy Spirit.", "Betrothed to Joseph, a descendant of the house of David, she accepted the angel Gabriel''s announcement of her pregnancy with faith and humility.", "She is venerated across Christian traditions as Theotokos (God-bearer) and a model of discipleship."]',
    '["Mary of Nazareth was chosen by God to bear the Messiah and remained a disciple of Jesus throughout his ministry, standing at the foot of the cross at his crucifixion."]',
    '[{"book": "Luke", "chapter": 1, "verse": 28}]',
    '{"mla_book": "Brown, Raymond E. \\u003cem\\u003eThe Birth of the Messiah\\u003c/em\\u003e. Doubleday, 1977.", "mla_book_inline": "(Brown, 1977)"}',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Public',
    0
);


-- =============================================================================
-- SECTION 2: EVENTS
-- =============================================================================

INSERT OR IGNORE INTO records (
    id, title, slug, gospel_category, era, timeline,
    map_label, geo_id, description, snippet,
    primary_verse, secondary_verse,
    bibliography, context_links,
    created_at, updated_at,
    users, page_views,
    wikipedia_title, wikipedia_rank,
    popular_challenge_title, popular_challenge_rank
) VALUES (
    '01HZ0000000000000000000004',
    'Baptism of Jesus',
    'baptism-of-jesus',
    'event',
    'Life',
    'LifeBaptism',
    'Judea',
    3388115987553280,
    '["The baptism of Jesus marks the formal beginning of his public ministry. He came from Galilee to the Jordan River to be baptised by John the Baptist.", "As Jesus came up from the water, the Spirit of God descended on him like a dove, and a voice from heaven declared: ''This is my Son, whom I love; with him I am well pleased.''", "This event is recorded in all four Gospels and serves as a Trinitarian epiphany — Father, Son, and Holy Spirit simultaneously revealed."]',
    '["Jesus''s baptism by John in the Jordan River marked the launch of his public ministry and was accompanied by the voice of God and the descent of the Holy Spirit.", "It is a foundational Trinitarian event in the Gospel narratives."]',
    '[{"book": "Matthew", "chapter": 3, "verse": 13}]',
    '[{"book": "Mark", "chapter": 1, "verse": 9}, {"book": "Luke", "chapter": 3, "verse": 21}, {"book": "John", "chapter": 1, "verse": 29}]',
    '{"mla_book": "Keener, Craig S. \\u003cem\\u003eThe Gospel of Matthew: A Socio-Rhetorical Commentary\\u003c/em\\u003e. Eerdmans, 2009.", "mla_book_inline": "(Keener, 2009)"}',
    '{"related": ["john-the-baptist", "temptation-of-jesus", "jesus-of-nazareth"]}',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Public',
    0,
    'Baptism of Jesus',
    5,
    'Was Jesus really baptised by John?',
    8
);

INSERT OR IGNORE INTO records (
    id, title, slug, gospel_category, era, timeline,
    map_label, description, snippet,
    primary_verse, secondary_verse,
    bibliography, context_links,
    created_at, updated_at,
    users, page_views,
    popular_challenge_title, popular_challenge_rank
) VALUES (
    '01HZ0000000000000000000005',
    'Temptation of Jesus',
    'temptation-of-jesus',
    'event',
    'Life',
    'LifeTemptation',
    'Judea',
    '["Immediately after his baptism, Jesus was led by the Spirit into the wilderness for forty days and forty nights, where he fasted and was tested by the devil.", "Satan presented three temptations: to turn stones into bread (physical want), to throw himself from the Temple pinnacle (miraculous proof), and to worship Satan in exchange for all the kingdoms of the world (power).", "Jesus resisted each temptation by quoting from the book of Deuteronomy, demonstrating his obedience as the true Israel where ancient Israel had failed."]',
    '["After his baptism, Jesus spent forty days and nights fasting in the Judean wilderness, where he was tested three times by Satan and overcame each temptation through scripture.", "His victory is seen as a reversal of Adam''s failure in the garden and Israel''s failure in the wilderness."]',
    '[{"book": "Matthew", "chapter": 4, "verse": 1}]',
    '[{"book": "Luke", "chapter": 4, "verse": 1}, {"book": "Hebrews", "chapter": 4, "verse": 15}]',
    '{"mla_book": "France, R.T. \\u003cem\\u003eThe Gospel of Matthew (NICNT)\\u003c/em\\u003e. Eerdmans, 2007.", "mla_book_inline": "(France, 2007)"}',
    '{"related": ["baptism-of-jesus", "jesus-of-nazareth"]}',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Public',
    0,
    'Was the temptation narrative legendary?',
    22
);

INSERT OR IGNORE INTO records (
    id, title, slug, gospel_category, era, timeline,
    map_label, description, snippet,
    primary_verse, secondary_verse,
    bibliography, context_links,
    created_at, updated_at,
    users, page_views,
    wikipedia_title, wikipedia_rank
) VALUES (
    '01HZ0000000000000000000006',
    'Sermon on the Mount',
    'sermon-on-the-mount',
    'event',
    'GalileeMinistry',
    'GalileeSermonMount',
    'Galilee',
    '["The Sermon on the Mount is the most extensive collection of Jesus'' teachings found in a single discourse, recorded primarily in Matthew 5–7.", "It opens with the Beatitudes — eight blessings that redefine what it means to be blessed — and continues with radical ethical teachings about anger, lust, oaths, retaliation, and love of enemies.", "The sermon concludes with the parable of the wise and foolish builders, urging hearers to act on his words, not merely hear them."]',
    '["Delivered on a hillside in Galilee, the Sermon on the Mount is Jesus''s definitive ethical and spiritual manifesto, reshaping traditional Jewish law through the lens of the Kingdom of God.", "It includes the Beatitudes, the Lord''s Prayer, and the Golden Rule."]',
    '[{"book": "Matthew", "chapter": 5, "verse": 3}]',
    '[{"book": "Luke", "chapter": 6, "verse": 20}]',
    '{"mla_book": "Stott, John R.W. \\u003cem\\u003eThe Message of the Sermon on the Mount\\u003c/em\\u003e. InterVarsity Press, 1978.", "mla_book_inline": "(Stott, 1978)"}',
    '{"related": ["jesus-of-nazareth", "mount-of-beatitudes"]}',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Public',
    0,
    'Sermon on the Mount',
    7
);

INSERT OR IGNORE INTO records (
    id, title, slug, gospel_category, era, timeline,
    map_label, description, snippet,
    primary_verse, secondary_verse,
    bibliography, context_links,
    created_at, updated_at,
    users, page_views,
    wikipedia_title, wikipedia_rank,
    popular_challenge_title, popular_challenge_rank
) VALUES (
    '01HZ0000000000000000000007',
    'Crucifixion of Jesus',
    'crucifixion-of-jesus',
    'event',
    'PassionWeek',
    'PassionFridayCrucifixionBegins',
    'Jerusalem',
    '["The crucifixion of Jesus took place outside Jerusalem at a place called Golgotha (''Place of the Skull'') on a Friday, shortly before the Jewish Passover.", "After a series of trials before the Jewish Sanhedrin and the Roman governor Pontius Pilate, Jesus was sentenced to death by crucifixion — the standard Roman method of execution for slaves and political rebels.", "He died approximately six hours after being crucified, and his death is attested by Roman historians Tacitus and Josephus, making it one of the best-evidenced events of ancient history."]',
    '["Jesus was crucified at Golgotha under Pontius Pilate c. AD 30–33, fulfilling multiple Old Testament prophecies and forming the cornerstone of Christian atonement theology.", "His death is corroborated by non-Christian Roman and Jewish sources."]',
    '[{"book": "John", "chapter": 19, "verse": 17}]',
    '[{"book": "Isaiah", "chapter": 53, "verse": 5}, {"book": "Psalms", "chapter": 22, "verse": 1}]',
    '{"mla_book": "Evans, Craig A. \\u003cem\\u003eJesus and the Remains of His Day\\u003c/em\\u003e. Hendrickson, 2015.", "mla_book_inline": "(Evans, 2015)", "mla_article": "Habermas, Gary R. \\u0022The Resurrection of Jesus: A Rational Inquiry.\\u0022 \\u003cem\\u003ePhilosophia Christi\\u003c/em\\u003e, 2003.", "mla_article_inline": "(Habermas, 2003)"}',
    '{"related": ["resurrection-of-jesus", "pontius-pilate", "golgotha-calvary"]}',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Public',
    0,
    'Crucifixion of Jesus',
    3,
    'Did Jesus actually die on the cross?',
    4
);

INSERT OR IGNORE INTO records (
    id, title, slug, gospel_category, era, timeline,
    map_label, description, snippet,
    primary_verse, secondary_verse,
    bibliography, context_links,
    created_at, updated_at,
    users, page_views,
    wikipedia_title, wikipedia_rank,
    popular_challenge_title, popular_challenge_rank,
    academic_challenge_title, academic_challenge_rank
) VALUES (
    '01HZ0000000000000000000008',
    'Resurrection of Jesus',
    'resurrection-of-jesus',
    'event',
    'Post-Passion',
    'PassionSundayResurrection',
    'Jerusalem',
    '["The resurrection of Jesus is the foundational claim of Christianity: that Jesus, who died by crucifixion on a Friday, rose bodily from the dead on the third day (Sunday).", "The empty tomb was discovered by a group of women including Mary Magdalene, who reported that the stone had been rolled away and the body was missing.", "Over the following forty days, Jesus appeared to numerous individuals and groups — including the twelve apostles and, according to Paul, to over five hundred people at once — before ascending to heaven."]',
    '["Jesus rose from the dead on the third day following his crucifixion, appearing to hundreds of witnesses and validating all his claims about himself.", "The resurrection is the cornerstone event of Christian faith, with extensive historical attestation."]',
    '[{"book": "1 Corinthians", "chapter": 15, "verse": 3}]',
    '[{"book": "Matthew", "chapter": 28, "verse": 6}, {"book": "Luke", "chapter": 24, "verse": 1}, {"book": "John", "chapter": 20, "verse": 1}]',
    '{"mla_book": "Habermas, Gary R., and Michael R. Licona. \\u003cem\\u003eThe Case for the Resurrection of Jesus\\u003c/em\\u003e. Kregel, 2004.", "mla_book_inline": "(Habermas and Licona, 2004)", "mla_article": "Wright, N.T. \\u0022The Resurrection of Jesus.\\u0022 \\u003cem\\u003eThe Cambridge Companion to Jesus\\u003c/em\\u003e, 2001.", "mla_article_inline": "(Wright, 2001)"}',
    '{"related": ["crucifixion-of-jesus", "jesus-of-nazareth", "empty-tomb-jerusalem"]}',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Public',
    0,
    'Resurrection of Jesus',
    2,
    'Did Jesus literally rise from the dead?',
    2,
    'Historical evidence for the resurrection',
    1
);


-- =============================================================================
-- SECTION 3: LOCATIONS
-- =============================================================================

INSERT OR IGNORE INTO records (
    id, title, slug, gospel_category, era, timeline,
    map_label, geo_id, description, snippet,
    primary_verse,
    bibliography,
    created_at, updated_at,
    users, page_views,
    wikipedia_title, wikipedia_rank
) VALUES (
    '01HZ0000000000000000000009',
    'Bethlehem',
    'bethlehem',
    'location',
    'EarlyLife',
    'EarlyLifeBirth',
    'Judea',
    3334290411003904,
    '["Bethlehem is an ancient city in the Judean hills, approximately 10 kilometres south of Jerusalem, and is the birthplace of Jesus Christ according to the Gospel accounts of Matthew and Luke.", "The town was also the birthplace of King David and held deep messianic significance — the prophet Micah had foretold that the Messiah would come from Bethlehem (Micah 5:2).", "Today the Church of the Nativity, one of the oldest continuously operating Christian churches in the world, stands over the traditional site of Jesus''s birth."]',
    '["Bethlehem, the city of David in Judea, is identified in the Gospels as the birthplace of Jesus, fulfilling the messianic prophecy of Micah 5:2.", "The Church of the Nativity marks the traditional site."]',
    '[{"book": "Micah", "chapter": 5, "verse": 2}]',
    '{"mla_book": "Murphy-O''Connor, Jerome. \\u003cem\\u003eThe Holy Land: An Oxford Archaeological Guide\\u003c/em\\u003e. 5th ed., Oxford University Press, 2008.", "mla_book_inline": "(Murphy-O''Connor, 2008)"}',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Public',
    0,
    'Bethlehem',
    15
);

INSERT OR IGNORE INTO records (
    id, title, slug, gospel_category, era, timeline,
    map_label, geo_id, description, snippet,
    primary_verse,
    bibliography, context_links,
    created_at, updated_at,
    users, page_views,
    wikipedia_title, wikipedia_rank
) VALUES (
    '01HZ0000000000000000000010',
    'Capernaum',
    'capernaum',
    'location',
    'GalileeMinistry',
    'GalileeCallingTwelve',
    'Galilee',
    3387704084340736,
    '["Capernaum was a fishing village on the northern shore of the Sea of Galilee that served as the headquarters of Jesus''s Galilean ministry.", "Jesus relocated to Capernaum from Nazareth and performed many of his most notable miracles there, including the healing of a centurion''s servant and the raising of Jairus''s daughter.", "Peter and Andrew, along with James and John, were called from their fishing boats near Capernaum. Archaeological excavations have uncovered a first-century house believed by many scholars to have been Peter''s home."]',
    '["Capernaum on the Sea of Galilee served as Jesus''s ministry base, where he taught in the synagogue, called his first disciples, and performed numerous healings.", "Ruins of the ancient synagogue and a house identified with Peter are accessible today."]',
    '[{"book": "Matthew", "chapter": 4, "verse": 13}]',
    '{"mla_book": "Nun, Mendel. \\u003cem\\u003eThe Sea of Galilee and Its Fishermen in the New Testament\\u003c/em\\u003e. Kibbutz Ein Gev, 1989.", "mla_book_inline": "(Nun, 1989)"}',
    '{"related": ["jesus-of-nazareth", "sermon-on-the-mount"]}',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Public',
    0,
    'Capernaum',
    20
);

INSERT OR IGNORE INTO records (
    id, title, slug, gospel_category, era, timeline,
    map_label, geo_id, description, snippet,
    primary_verse,
    bibliography, context_links,
    created_at, updated_at,
    users, page_views,
    wikipedia_title, wikipedia_rank
) VALUES (
    '01HZ0000000000000000000011',
    'Jerusalem — Temple Mount',
    'jerusalem-temple-mount',
    'location',
    'PassionWeek',
    'PassionMondayCleansing',
    'Jerusalem',
    3334680946343936,
    '["The Temple Mount in Jerusalem was the most sacred site in Judaism — the location of the Second Temple rebuilt by Herod the Great and the focal point of Jewish worship and pilgrimage.", "Jesus visited the Temple regularly throughout the Gospel narratives, most dramatically when he cleansed it by overturning the tables of the money-changers at the start of Passion Week.", "He also taught daily in the Temple courts during Passion Week, debating Pharisees, Sadducees, and scribes on questions of scripture, resurrection, and authority."]',
    '["The Temple Mount was the spiritual heart of first-century Judaism and the setting for several of Jesus''s most dramatic acts, including the Temple cleansing and his final week of teaching before his arrest."]',
    '[{"book": "Mark", "chapter": 11, "verse": 15}]',
    '{"mla_book": "Ritmeyer, Leen. \\u003cem\\u003eThe Quest: Revealing the Temple Mount in Jerusalem\\u003c/em\\u003e. Carta Jerusalem, 2006.", "mla_book_inline": "(Ritmeyer, 2006)"}',
    '{"related": ["crucifixion-of-jesus", "resurrection-of-jesus"]}',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Public',
    0,
    'Temple Mount',
    10
);


-- =============================================================================
-- SECTION 4: THEMES
-- =============================================================================

INSERT OR IGNORE INTO records (
    id, title, slug, gospel_category,
    description, snippet,
    primary_verse, secondary_verse,
    bibliography,
    ordo_salutis,
    created_at, updated_at,
    users, page_views
) VALUES (
    '01HZ0000000000000000000012',
    'Kingdom of God',
    'kingdom-of-god',
    'theme',
    '["The Kingdom of God is the central theme of Jesus''s preaching: the dynamic reign of God breaking into human history through the person and work of Jesus.", "Jesus proclaimed that the Kingdom was ''at hand'' (imminently arriving) and yet also described it as something still to come in its fullness — a tension theologians call ''already but not yet''.", "He illustrated its nature through dozens of parables — comparing it to a mustard seed, a hidden treasure, a pearl of great price, and a great banquet — each revealing a different facet of its character."]',
    '["The Kingdom of God is the ruling act of God in history, inaugurated by Jesus, experienced now in part, and to be consummated at his return.", "It is the master-theme around which all of Jesus''s teachings cohere."]',
    '[{"book": "Mark", "chapter": 1, "verse": 15}]',
    '[{"book": "Matthew", "chapter": 6, "verse": 33}, {"book": "Luke", "chapter": 17, "verse": 21}]',
    '{"mla_book": "Ladd, George Eldon. \\u003cem\\u003eThe Presence of the Future\\u003c/em\\u003e. Eerdmans, 1974.", "mla_book_inline": "(Ladd, 1974)"}',
    'Justification',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Public',
    0
);

INSERT OR IGNORE INTO records (
    id, title, slug, gospel_category,
    description, snippet,
    primary_verse, secondary_verse,
    bibliography,
    ordo_salutis,
    created_at, updated_at,
    users, page_views
) VALUES (
    '01HZ0000000000000000000013',
    'Atonement',
    'atonement',
    'theme',
    '["Atonement refers to the doctrine that Jesus''s death on the cross accomplished the reconciliation of sinful humanity with a holy God.", "The New Testament presents multiple complementary models: penal substitution (Christ bore God''s wrath in our place), ransom (his life given as a ransom for many), and Christus Victor (his death and resurrection defeating the powers of sin, death, and the devil).", "The OId Testament foundation is the sacrificial system of Leviticus — particularly the Day of Atonement — which Jesus''s death is presented as fulfilling and surpassing (Hebrews 9–10)."]',
    '["Atonement is the theological doctrine that Christ''s death reconciled humanity to God, accomplished through his substitutionary sacrifice, fulfilling the Old Testament sacrificial types.", "It is the engine of Christian salvation."]',
    '[{"book": "Romans", "chapter": 3, "verse": 25}]',
    '[{"book": "Hebrews", "chapter": 9, "verse": 22}, {"book": "Isaiah", "chapter": 53, "verse": 5}]',
    '{"mla_book": "Morris, Leon. \\u003cem\\u003eThe Apostolic Preaching of the Cross\\u003c/em\\u003e. Eerdmans, 1955.", "mla_book_inline": "(Morris, 1955)"}',
    'Justification',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Public',
    0
);


-- =============================================================================
-- SECTION 5: OBJECTS
-- =============================================================================

INSERT OR IGNORE INTO records (
    id, title, slug, gospel_category, era, timeline,
    map_label, description, snippet,
    primary_verse, secondary_verse,
    bibliography, context_links,
    created_at, updated_at,
    users, page_views,
    wikipedia_title, wikipedia_rank,
    iaa, manuscript
) VALUES (
    '01HZ0000000000000000000014',
    'The Cross',
    'the-cross',
    'object',
    'PassionWeek',
    'PassionFridayCrucifixionBegins',
    'Jerusalem',
    '["The cross is the wooden instrument of execution on which Jesus died and has become the universal symbol of Christianity.", "Roman crucifixion crosses typically took one of two forms: the crux commissa (T-shape) or the crux immissa (the traditional dagger shape with a projecting top beam on which a title-board was affixed).", "Archaeological evidence for crucifixion practices in first-century Judea was dramatically confirmed by the 1968 discovery at Giv''at HaMivtar in Jerusalem of a heel bone pierced by a nail — the first physical remains of a crucified individual ever found."]',
    '["The cross is both the historical instrument of Jesus''s execution and the supreme symbol of Christian faith, representing self-giving love, sacrificial atonement, and the defeat of death."]',
    '[{"book": "John", "chapter": 19, "verse": 17}]',
    '[{"book": "Galatians", "chapter": 6, "verse": 14}, {"book": "1 Corinthians", "chapter": 1, "verse": 18}]',
    '{"mla_article": "Zias, Joseph, and Eliezer Sekeles. \\u0022The Crucified Man from Giv\\u2019at HaMivtar: A Reappraisal.\\u0022 \\u003cem\\u003eIsrael Exploration Journal\\u003c/em\\u003e, vol. 35, no. 1, 1985, pp. 22-27.", "mla_article_inline": "(Zias and Sekeles, 1985)"}',
    '{"related": ["crucifixion-of-jesus", "golgotha-calvary"]}',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Public',
    0,
    'Crucifixion',
    6,
    'IAA-1968-GHM-001',
    'P46'
);

INSERT OR IGNORE INTO records (
    id, title, slug, gospel_category, era, timeline,
    map_label, description, snippet,
    primary_verse, secondary_verse,
    bibliography, context_links,
    created_at, updated_at,
    users, page_views,
    wikipedia_title, wikipedia_rank
) VALUES (
    '01HZ0000000000000000000015',
    'The Lord''s Supper',
    'the-lords-supper',
    'object',
    'PassionWeek',
    'PassionMaundyLastSupper',
    'Jerusalem',
    '["The Lord''s Supper (also known as the Last Supper, Eucharist, or Communion) was the final meal Jesus shared with his twelve apostles on the night before his crucifixion.", "During the meal, Jesus took bread, broke it, and declared it to be his body; then took a cup of wine and declared it to be his blood ''shed for many for the forgiveness of sins''.", "He commanded his disciples to continue the practice ''in remembrance of me,'' making it the central ongoing sacrament or ordinance of the Christian church — observed weekly by billions of believers across every tradition worldwide."]',
    '["The Last Supper, observed the night before his crucifixion, instituted the ongoing Christian practice of Communion in which bread and wine represent Jesus''s broken body and shed blood.", "It is the most widely observed Christian rite in history."]',
    '[{"book": "Luke", "chapter": 22, "verse": 19}]',
    '[{"book": "1 Corinthians", "chapter": 11, "verse": 23}, {"book": "Matthew", "chapter": 26, "verse": 26}]',
    '{"mla_book": "Jeremias, Joachim. \\u003cem\\u003eThe Eucharistic Words of Jesus\\u003c/em\\u003e. Translated by Norman Perrin, SCM Press, 1966.", "mla_book_inline": "(Jeremias, 1966)"}',
    '{"related": ["crucifixion-of-jesus", "jerusalem-temple-mount", "jesus-of-nazareth"]}',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00Z',
    'Public',
    0,
    'Last Supper',
    9
);


-- =============================================================================
-- END OF SEED DATA
-- =============================================================================
