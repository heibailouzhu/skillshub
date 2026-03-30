-- 修复 rating_avg 字段类型：从 NUMERIC 改为 FLOAT8
ALTER TABLE skills ALTER COLUMN rating_avg TYPE FLOAT8 USING rating_avg::DOUBLE PRECISION;
