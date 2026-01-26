-- 1. Enable RLS on 'posts' table
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 2. SELECT policy: Allow reading if the post is public OR if the user is the author
-- '기존 GET /board 동작을 유지하는 SELECT 정책'
CREATE POLICY "Allow select for public posts and authors"
ON posts
FOR SELECT
USING (
  is_public = true
  OR
  (auth.uid() IS NOT NULL AND author_id::text = (auth.jwt() ->> 'sub'))
);

-- 3. INSERT policy: Allow authenticated users to create posts
-- '기존 POST /board 동작을 깨지 않는 INSERT 정책'
CREATE POLICY "Allow insert for authenticated users"
ON posts
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- 4. UPDATE policy: Allow authors to update their own posts
CREATE POLICY "Allow update for authors"
ON posts
FOR UPDATE
USING (
  (auth.uid() IS NOT NULL AND author_id::text = (auth.jwt() ->> 'sub'))
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND author_id::text = (auth.jwt() ->> 'sub'))
);

-- 5. DELETE policy: Allow authors to delete their own posts
CREATE POLICY "Allow delete for authors"
ON posts
FOR DELETE
USING (
  (auth.uid() IS NOT NULL AND author_id::text = (auth.jwt() ->> 'sub'))
);

-- [참고] author_id가 integer이고 Supabase auth.uid()가 UUID인 경우를 대비하여
-- auth.jwt() ->> 'sub'를 사용하여 문자열 비교를 수행합니다.
-- 실제 운영 환경에서는 users 테이블의 id 타입을 UUID로 맞추는 것이 권장됩니다.
