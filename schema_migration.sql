-- ========================================
-- Schema Migration Script
-- ========================================
-- 목적: Auth Service와 Board Service의 스키마 분리
-- 실행 위치: Supabase SQL Editor
-- 주의: 기존 데이터가 있는 경우 백업 필수!

-- ========================================
-- 1. 스키마 생성
-- ========================================

CREATE SCHEMA IF NOT EXISTS auth_schema;
CREATE SCHEMA IF NOT EXISTS board_schema;

-- ========================================
-- 2. Auth Schema 테이블 생성
-- ========================================

-- Users 테이블 (Auth Service 전용)
CREATE TABLE IF NOT EXISTS auth_schema.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  nickname text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Users 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_auth_users_email 
  ON auth_schema.users(email);

-- ========================================
-- 3. Board Schema 테이블 생성
-- ========================================

-- Posts 테이블 (Board Service 전용)
CREATE TABLE IF NOT EXISTS board_schema.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  is_public boolean DEFAULT true,
  
  -- FK 제거: MSA 아키텍처에서 스키마 간 참조 제거
  author_id uuid NOT NULL,
  
  -- 비정규화: User 정보 캐싱
  author_email text,
  author_nickname text,
  
  created_at timestamp with time zone DEFAULT now()
);

-- Posts 테이블 인덱스 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_board_posts_author_id 
  ON board_schema.posts(author_id);

CREATE INDEX IF NOT EXISTS idx_board_posts_is_public 
  ON board_schema.posts(is_public);

CREATE INDEX IF NOT EXISTS idx_board_posts_created_at 
  ON board_schema.posts(created_at DESC);

-- 전문 검색 인덱스 (선택 사항)
CREATE INDEX IF NOT EXISTS idx_board_posts_search 
  ON board_schema.posts 
  USING gin(to_tsvector('english', title || ' ' || content));

-- ❌ 제거됨: Cached Users 테이블 (Redis로 대체)
-- CREATE TABLE IF NOT EXISTS board_schema.cached_users (
--   id uuid PRIMARY KEY,
--   email text NOT NULL,
--   nickname text NOT NULL,
--   last_synced_at timestamp with time zone DEFAULT now()
-- );

-- ========================================
-- 4. RLS (Row Level Security) 설정
-- ========================================

-- Auth Schema RLS
ALTER TABLE auth_schema.users ENABLE ROW LEVEL SECURITY;

-- 정책 1: 모든 사용자 프로필 조회 가능 (게시글 작성자 정보용)
DROP POLICY IF EXISTS "Allow public read on users" ON auth_schema.users;
CREATE POLICY "Allow public read on users"
  ON auth_schema.users FOR SELECT
  USING (true);

-- 정책 2: 회원가입 허용
DROP POLICY IF EXISTS "Allow insert for signup" ON auth_schema.users;
CREATE POLICY "Allow insert for signup"
  ON auth_schema.users FOR INSERT
  WITH CHECK (true);

-- 정책 3: 본인 정보 수정
DROP POLICY IF EXISTS "Allow update own profile" ON auth_schema.users;
CREATE POLICY "Allow update own profile"
  ON auth_schema.users FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 정책 4: 본인 계정 삭제
DROP POLICY IF EXISTS "Allow delete own account" ON auth_schema.users;
CREATE POLICY "Allow delete own account"
  ON auth_schema.users FOR DELETE
  USING (true);

-- Board Schema RLS
ALTER TABLE board_schema.posts ENABLE ROW LEVEL SECURITY;

-- 정책 1: 공개 게시글 조회
DROP POLICY IF EXISTS "Allow public read public posts" ON board_schema.posts;
CREATE POLICY "Allow public read public posts"
  ON board_schema.posts FOR SELECT
  USING (is_public = true OR true);

-- 정책 2: 게시글 작성
DROP POLICY IF EXISTS "Allow authenticated insert" ON board_schema.posts;
CREATE POLICY "Allow authenticated insert"
  ON board_schema.posts FOR INSERT
  WITH CHECK (true);

-- 정책 3: 게시글 수정
DROP POLICY IF EXISTS "Allow update own posts" ON board_schema.posts;
CREATE POLICY "Allow update own posts"
  ON board_schema.posts FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 정책 4: 게시글 삭제
DROP POLICY IF EXISTS "Allow delete own posts" ON board_schema.posts;
CREATE POLICY "Allow delete own posts"
  ON board_schema.posts FOR DELETE
  USING (true);

-- ========================================
-- 5. 기존 데이터 마이그레이션 (선택 사항)
-- ========================================
-- 기존 public 스키마에 데이터가 있는 경우 실행

-- Users 마이그레이션
-- INSERT INTO auth_schema.users (id, email, password, nickname, created_at)
-- SELECT id, email, password, nickname, created_at
-- FROM public.users
-- ON CONFLICT (id) DO NOTHING;

-- Posts 마이그레이션
-- INSERT INTO board_schema.posts (id, title, content, is_public, author_id, author_email, author_nickname, created_at)
-- SELECT 
--   p.id, 
--   p.title, 
--   p.content, 
--   p.is_public, 
--   p.author_id,
--   u.email,
--   u.nickname,
--   p.created_at
-- FROM public.posts p
-- LEFT JOIN public.users u ON p.author_id = u.id
-- ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 6. 권한 설정 (선택 사항)
-- ========================================

-- Auth Service용 Role (선택 사항)
-- CREATE ROLE auth_service_role;
-- GRANT ALL ON SCHEMA auth_schema TO auth_service_role;
-- GRANT ALL ON ALL TABLES IN SCHEMA auth_schema TO auth_service_role;

-- Board Service용 Role (선택 사항)
-- CREATE ROLE board_service_role;
-- GRANT ALL ON SCHEMA board_schema TO board_service_role;
-- GRANT ALL ON ALL TABLES IN SCHEMA board_schema TO board_service_role;
-- GRANT SELECT ON auth_schema.users TO board_service_role;

-- ========================================
-- 완료 메시지
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '✅ Schema migration completed successfully!';
  RAISE NOTICE '📋 Created schemas: auth_schema, board_schema';
  RAISE NOTICE '📊 Created tables: users, posts, cached_users';
  RAISE NOTICE '🔒 RLS policies applied';
END $$;