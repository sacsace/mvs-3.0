-- 회사 이미지 컬럼 타입 변경 스크립트
-- VARCHAR(255) → BYTEA로 변경

-- 1. 회사 로고 컬럼 변경
ALTER TABLE company 
ALTER COLUMN company_logo TYPE BYTEA USING company_logo::BYTEA;

-- 2. 회사 인장 컬럼 변경  
ALTER TABLE company 
ALTER COLUMN company_seal TYPE BYTEA USING company_seal::BYTEA;

-- 3. 대표자 서명 컬럼 변경
ALTER TABLE company 
ALTER COLUMN ceo_signature TYPE BYTEA USING ceo_signature::BYTEA;

-- 컬럼 코멘트 추가
COMMENT ON COLUMN company.company_logo IS '회사 로고 이미지 (BYTEA)';
COMMENT ON COLUMN company.company_seal IS '회사 인장 이미지 (BYTEA)';
COMMENT ON COLUMN company.ceo_signature IS '대표자 서명 이미지 (BYTEA)';

-- 변경 사항 확인
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'company' 
AND column_name IN ('company_logo', 'company_seal', 'ceo_signature')
ORDER BY ordinal_position;
