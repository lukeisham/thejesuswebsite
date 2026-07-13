-- Add timeline placement offsets to evidence table
-- Allows fine-tuning per-node position on the timeline canvas
-- timeline_offset_x: fraction of period slot width relative to centre, clamped -0.5..0.5
-- timeline_offset_y: fraction of canvas height relative to spine, clamped -0.4..0.4

ALTER TABLE evidence ADD COLUMN timeline_offset_x REAL;
ALTER TABLE evidence ADD COLUMN timeline_offset_y REAL;
