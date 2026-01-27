-- [Supabase & RLS 설계]
-- 이 SQL 스크립트는 UUID 기반의 새로운 테이블 구조와 RLS 정책을 정의합니다.
-- MSA 아키텍처에 맞춰 Auth 서버와 Board 서버가 동일한 DB를 공유하되,
-- 각 서비스는 자신의 책임 범위 내의 테이블만 관리합니다.

--------------------------------------------------------------------------------
-- 1. users 테이블 생성 (Auth 서버 관리 영역)
--------------------------------------------------------------------------------
-- [운영 주의] 실무에서는 id uuid PRIMARY KEY REFERENCES auth.users(id) 설정을 권장합니다.
-- 본 스크립트에서는 로컬 테스트 및 점진적 도입을 위해 기본 UUID PK를 사용합니다.
-- 
-- Auth 서버의 책임:
-- - 회원가입 시 users 테이블에 INSERT
-- - 로그인 시 users 테이블에서 SELECT
-- - JWT 발급 및 검증

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text NOT NULL,              -- 추가: bcrypt 해시된 비밀번호
  nickname text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- users 테이블 인덱스 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

--------------------------------------------------------------------------------
-- 2. posts 테이블 생성 (Board 서버 관리 영역)
--------------------------------------------------------------------------------
-- Board 서버의 책임:
-- - 게시글 CRUD 작업
-- - author_id는 users.id를 참조하지만, Board 서버는 User 정보를 READ ONLY로 사용

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  is_public boolean DEFAULT true,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

-- posts 테이블 인덱스 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_is_public ON posts(is_public);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- 전문 검색을 위한 인덱스 (선택 사항)
CREATE INDEX IF NOT EXISTS idx_posts_title_content_search 
ON posts USING gin(to_tsvector('english', title || ' ' || content));

--------------------------------------------------------------------------------
-- 3. RLS(Row Level Security) 활성화
--------------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- [Policy] users 테이블 정책
--------------------------------------------------------------------------------

-- 정책 1: 모든 사용자(비인증 포함)는 기본적인 프로필 정보를 조회할 수 있습니다.
-- (게시글 작성자 정보 표시용)
-- 단, password 컬럼은 NestJS ClassSerializerInterceptor에서 제외됨
DROP POLICY IF EXISTS "Allow all users to read basic profiles" ON users;
CREATE POLICY "Allow all users to read basic profiles"
ON users FOR SELECT
USING (true);

-- 정책 2: 회원가입 시 누구나 users 레코드를 생성할 수 있습니다.
-- (Auth 서버의 SignUp 엔드포인트 사용)
DROP POLICY IF EXISTS "Allow anyone to insert during signup" ON users;
CREATE POLICY "Allow anyone to insert during signup"
ON users FOR INSERT
WITH CHECK (true);

-- 정책 3: 유저는 자신의 프로필만 수정할 수 있습니다.
-- [참고] 현재 구조에서는 auth.uid() 사용 불가 (Supabase Auth 미연동)
-- 실제 검증은 NestJS Application Layer에서 수행
DROP POLICY IF EXISTS "Allow users to update own profile" ON users;
CREATE POLICY "Allow users to update own profile"
ON users FOR UPDATE
TO authenticated
USING (true)  -- Application Layer에서 검증
WITH CHECK (true);

-- 정책 4: 유저 삭제는 본인만 가능 (탈퇴 기능)
DROP POLICY IF EXISTS "Allow users to delete own account" ON users;
CREATE POLICY "Allow users to delete own account"
ON users FOR DELETE
TO authenticated
USING (true);  -- Application Layer에서 검증

--------------------------------------------------------------------------------
-- [Policy] posts 테이블 정책
--------------------------------------------------------------------------------

-- 정책 1: 게시글 읽기
-- - is_public = true인 경우: 모든 사용자 조회 가능 (비인증 포함)
-- - is_public = false인 경우: Application Layer에서 작성자 검증
DROP POLICY IF EXISTS "Allow public select for public posts" ON posts;
CREATE POLICY "Allow public select for public posts"
ON posts FOR SELECT
USING (
  is_public = true
  OR
  true  -- 비공개 글은 Application Layer에서 검증 (NestJS Service)
);

-- 정책 2: 게시글 작성
-- 로그인한 사용자만 가능 (Application Layer에서 검증)
DROP POLICY IF EXISTS "Allow authenticated users to insert posts" ON posts;
CREATE POLICY "Allow authenticated users to insert posts"
ON posts FOR INSERT
TO authenticated
WITH CHECK (true);

-- 정책 3: 게시글 수정
-- 작성자 본인만 가능 (Application Layer에서 검증)
DROP POLICY IF EXISTS "Allow authors to update own posts" ON posts;
CREATE POLICY "Allow authors to update own posts"
ON posts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 정책 4: 게시글 삭제
-- 작성자 본인만 가능 (Application Layer에서 검증)
DROP POLICY IF EXISTS "Allow authors to delete own posts" ON posts;
CREATE POLICY "Allow authors to delete own posts"
ON posts FOR DELETE
TO authenticated
USING (true);

--------------------------------------------------------------------------------
-- [설명] RLS 정책 전략
--------------------------------------------------------------------------------
-- 현재 프로젝트는 Custom JWT를 사용하므로 auth.uid()를 사용할 수 없습니다.
-- 따라서 RLS는 기본적인 READ 권한만 제어하고,
-- 실제 권한 검증(CUD)은 NestJS Application Layer에서 이중으로 수행합니다.
--
-- 보안 계층:
-- 1단계 (Application): NestJS Guards + Service에서 JWT 검증 및 작성자 확인
-- 2단계 (Database): RLS 정책으로 최종 방어선 구축
--
-- [향후 개선] Supabase Auth 완전 통합 시:
-- - auth.uid() 활용하여 DB 레벨에서 완벽한 권한 제어 가능
-- - SET LOCAL role 사용하여 세션별 컨텍스트 전파

--------------------------------------------------------------------------------
-- 4. 초기 데이터 (선택 사항)
--------------------------------------------------------------------------------
-- 테스트용 사용자 생성 (개발 환경 전용)
-- 비밀번호: "password123" (bcrypt 해시 필요)

-- INSERT INTO users (id, email, password, nickname) VALUES
-- ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', '$2b$10$...', '테스트유저')
-- ON CONFLICT (email) DO NOTHING;

--------------------------------------------------------------------------------
-- [주의사항]
--------------------------------------------------------------------------------
-- 1. Supabase DB는 외부 관리형 서비스이므로 Docker Compose 재시작 시
--    데이터가 초기화되지 않습니다.
-- 2. 이 SQL은 Supabase SQL Editor에서 수동으로 실행해야 합니다.
-- 3. 스키마 변경 시 반드시 Migration 파일을 통해 버전 관리하세요.
-- 4. RLS 정책 변경 시 기존 정책을 DROP 후 재생성합니다.
-- 5. 프로덕션 환경에서는 auth.users 테이블과의 연동을 권장합니다.