-- Supabase RLS (Row Level Security) 설정 SQL
-- 이 명령어를 Supabase SQL Editor에 붙여넣어 실행하세요.

-- 1. posts 테이블 보안 설정
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 읽기 허용
CREATE POLICY "Enable read access for all users" ON "public"."posts"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

-- 작성자 본인만 수정/삭제 허용 (author_id 기준)
-- 주의: Supabase Auth를 사용하지 않는 경우 auth.uid() 대신 다른 방식을 사용해야 할 수 있습니다.
CREATE POLICY "Enable all access for authors only" ON "public"."posts"
AS PERMISSIVE FOR ALL
TO authenticated
USING (author_id::text = auth.uid()::text)
WITH CHECK (author_id::text = auth.uid()::text);


-- 2. users 테이블 보안 설정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 공개 프로필 정보(닉네임 등)만 조회 가능하도록 설정하거나,
-- 본인 정보만 조회 가능하도록 설정할 수 있습니다.
CREATE POLICY "Users can view their own data" ON "public"."users"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (id::text = auth.uid()::text);

CREATE POLICY "Users can update their own data" ON "public"."users"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (id::text = auth.uid()::text)
WITH CHECK (id::text = auth.uid()::text);
