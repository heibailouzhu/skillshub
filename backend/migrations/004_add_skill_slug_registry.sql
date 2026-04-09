ALTER TABLE skills
ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

WITH normalized AS (
    SELECT
        s.id,
        s.created_at,
        CASE
            WHEN trim(both '-' from regexp_replace(lower(coalesce(s.title, '')), '[^a-z0-9]+', '-', 'g')) = ''
                THEN 'skill'
            ELSE trim(both '-' from regexp_replace(lower(coalesce(s.title, '')), '[^a-z0-9]+', '-', 'g'))
        END AS base_slug
    FROM skills s
),
ranked AS (
    SELECT
        n.id,
        n.base_slug,
        row_number() OVER (PARTITION BY n.base_slug ORDER BY n.created_at, n.id) AS slug_rank
    FROM normalized n
)
UPDATE skills s
SET slug = CASE
    WHEN ranked.slug_rank = 1 THEN ranked.base_slug
    ELSE ranked.base_slug || '-' || ranked.slug_rank
END
FROM ranked
WHERE s.id = ranked.id
  AND (s.slug IS NULL OR s.slug = '');

ALTER TABLE skills
ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_slug ON skills(slug);
