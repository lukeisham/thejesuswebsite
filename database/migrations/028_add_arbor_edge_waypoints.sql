-- Add grid-snapped re-route waypoints to arbor edges.
-- NULL = default orthogonal routing (unchanged behavior); a JSON array of
-- {x, y} diagram-space points overrides the default path. See
-- arbor-edge-waypoints.md.

ALTER TABLE arbor_edges ADD COLUMN waypoints TEXT;
