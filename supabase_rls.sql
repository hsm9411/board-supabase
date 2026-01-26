-- [Supabase & RLS 설계]
-- 이 SQL 스크립트는 UUID 기반의 새로운 테이블 구조와 RLS 정책을 정의합니다.
-- 기존의 number(int) 기반 ID 구조에서 Supabase Auth와 자연스럽게 연동되는 UUID 구조로 재설계되었습니다.

-- 1. users 테이블 생성 (Supabase Auth와 연동)
-- [운영 주의] 실무에서는 id uuid PRIMARY KEY REFERENCES auth.users(id) 설정을 권장합니다.
-- 본 스크립트에서는 로컬 테스트 및 점진적 도입을 위해 기본 UUID PK를 사용합니다.
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  nickname text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. posts 테이블 생성 (UUID 기반 및 FK 설정)
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  is_public boolean DEFAULT true,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. RLS(Row Level Security) 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- [Policy] users 테이블 정책
--------------------------------------------------------------------------------

-- 모든 인증된 사용자는 유저 프로필(email, nickname)을 조회할 수 있습니다. (게시글 작성자 정보 확인용)
CREATE POLICY "Allow authenticated users to read profiles"
ON users FOR SELECT
TO authenticated
USING (true);

-- 유저는 자신의 프로필만 수정할 수 있습니다. (보안 및 데이터 무결성 보장)
CREATE POLICY "Allow users to update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

--------------------------------------------------------------------------------
-- [Policy] posts 테이블 정책
--------------------------------------------------------------------------------

-- 1. 게시글 읽기: 비로그인 사용자 포함 전체 공개 (is_public = true인 경우)
-- 또는 작성자 본인인 경우 (비공개 글 포함)
CREATE POLICY "Allow public select for public posts"
ON posts FOR SELECT
USING (
  is_public = true
  OR
  (auth.uid() IS NOT NULL AND author_id = auth.uid())
);

-- 2. 게시글 작성: 로그인한 사용자만 가능
CREATE POLICY "Allow authenticated users to insert posts"
ON posts FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid());

-- 3. 게시글 수정: 작성자 본인만 가능
CREATE POLICY "Allow authors to update own posts"
ON posts FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- 4. 게시글 삭제: 작성자 본인만 가능
CREATE POLICY "Allow authors to delete own posts"
ON posts FOR DELETE
TO authenticated
USING (author_id = auth.uid());

-- [주의] Supabase DB는 외부 관리형 서비스이므로 Docker Compose 재시작 시
-- 데이터가 초기화되지 않으며, 이 SQL은 Supabase SQL Editor에서 수동으로 실행해야 합니다.
