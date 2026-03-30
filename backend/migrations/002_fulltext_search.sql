-- 添加全文搜索和标签过滤优化

-- 为 skills 表添加全文搜索列
ALTER TABLE skills ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 创建触发器函数，自动更新搜索向量
CREATE OR REPLACE FUNCTION skills_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.content, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS skills_search_vector_trigger ON skills;
CREATE TRIGGER skills_search_vector_trigger
    BEFORE INSERT OR UPDATE ON skills
    FOR EACH ROW
    EXECUTE FUNCTION skills_search_vector_update();

-- 为现有数据生成搜索向量
UPDATE skills SET search_vector =
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'D')
WHERE search_vector IS NULL;

-- 创建全文搜索索引
CREATE INDEX IF NOT EXISTS idx_skills_search_vector ON skills USING GIN(search_vector);

-- 创建标签搜索索引
CREATE INDEX IF NOT EXISTS idx_skills_tags ON skills USING GIN(tags);

-- 添加热门分类视图
CREATE OR REPLACE VIEW popular_categories AS
SELECT
    category,
    COUNT(*) as skill_count
FROM skills
WHERE is_published = true AND is_deleted = false
GROUP BY category
ORDER BY skill_count DESC
LIMIT 20;

-- 添加热门标签视图
CREATE OR REPLACE VIEW popular_tags AS
SELECT
    unnest(tags) as tag,
    COUNT(*) as skill_count
FROM skills
WHERE is_published = true AND is_deleted = false AND array_length(tags, 1) > 0
GROUP BY tag
ORDER BY skill_count DESC
LIMIT 50;
