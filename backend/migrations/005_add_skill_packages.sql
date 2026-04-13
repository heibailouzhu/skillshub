CREATE TABLE IF NOT EXISTS skill_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    archive_path TEXT NOT NULL,
    extracted_path TEXT NOT NULL,
    entry_file TEXT NOT NULL DEFAULT 'SKILL.md',
    manifest_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    file_count INTEGER NOT NULL DEFAULT 0,
    total_size BIGINT NOT NULL DEFAULT 0,
    bundle_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(skill_id, version)
);

CREATE INDEX IF NOT EXISTS idx_skill_packages_skill_id ON skill_packages(skill_id);
