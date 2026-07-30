-- Migration 038: Publish the five Wikipedia articles added by the rubric
-- honesty and reproducibility pass.
--
-- deploy.sh's Wikipedia import step ran without --publish before this fix,
-- so newly-INSERTed rows (unlike updated existing rows) defaulted to
-- published_draft = 0 and were invisible on the public /debate/wikipedia
-- page and GET /api/wikipedia despite being live in the database. This is a
-- one-time reconciliation for the five rows already created by that run;
-- deploy.sh now passes --publish so future additions publish automatically.
UPDATE wikipedia_articles
SET published_draft = 1
WHERE slug IN (
  'church-of-the-holy-sepulchre',
  'church-of-the-nativity',
  'decapolis',
  'caesarea-philippi',
  'christ-myth-theory'
);
