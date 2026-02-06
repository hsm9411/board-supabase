# 포트폴리오 사이트 구성 계획

> **목표**: 현재 백엔드 API를 활용한 개인 포트폴리오 블로그 사이트 구축
> **작성일**: 2026-02-06

---

## 🎯 요구사항 정리

### 핵심 기능
1. ✅ **인증** - 회원가입/로그인 (이미 구현됨)
2. 🆕 **프로젝트 포트폴리오** - 내가 만든 프로젝트 게시
3. 🆕 **댓글 시스템** - 댓글/대댓글, 익명/로그인 구분
4. 🆕 **프론트엔드** - 블로그 형태 UI/UX

### 사용자 시나리오
```
익명 사용자
├── 프로젝트 목록 조회 ✅
├── 프로젝트 상세 조회 ✅
└── 댓글 작성 (익명) 🆕

로그인 사용자
├── 모든 익명 기능 +
├── 댓글 작성 (닉네임 표시) 🆕
└── 내 댓글 관리 🆕

관리자 (본인)
├── 프로젝트 CRUD 🆕
├── 댓글 관리 🆕
└── 대시보드 🆕
```

---

## 🏗️ 시스템 설계

### 아키텍처 선택

#### 옵션 1: 프론트엔드만 추가 (권장) ✅
```
현재 백엔드 (NestJS)
├── Auth Service (이미 있음)
├── Board Service → Portfolio Service (재활용)
└── Comment Service (신규 추가)

프론트엔드 (신규)
└── Next.js 14 (App Router)
    ├── SSR/SSG (SEO 최적화)
    ├── Tailwind CSS
    └── ShadcnUI
```

**장점**:
- 기존 인프라 재활용
- 빠른 개발 가능
- 무료 서버 리소스 절약

#### 옵션 2: 모노레포 (시간 더 소요)
```
monorepo/
├── apps/
│   ├── backend/ (기존)
│   └── frontend/ (신규)
└── packages/
    └── shared/ (공통 타입)
```

**결론**: **옵션 1 선택** (빠르고 효율적)

---

## 📋 단계별 구현 계획

### Phase 1: 백엔드 확장 (2-3일)

#### 1-1. Board Service → Portfolio Service 변환
```typescript
// 기존: Post (게시글)
// 변경: Project (프로젝트 포트폴리오)

@Entity('projects', { schema: 'portfolio_schema' })
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;  // 프로젝트 제목

  @Column('text')
  description: string;  // 프로젝트 설명

  @Column('text')
  content: string;  // 상세 내용 (Markdown)

  @Column('simple-array', { nullable: true })
  techStack: string[];  // ['NestJS', 'React', 'Docker']

  @Column({ nullable: true })
  githubUrl: string;  // GitHub 링크

  @Column({ nullable: true })
  demoUrl: string;  // 데모 링크

  @Column({ nullable: true })
  thumbnail: string;  // 썸네일 이미지 URL

  @Column({ default: true })
  isPublic: boolean;

  @Column({ name: 'author_id' })
  authorId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### 1-2. Comment Service 신규 생성
```typescript
@Entity('comments', { schema: 'portfolio_schema' })
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;  // 어떤 프로젝트에 달린 댓글인지

  @Column('text')
  content: string;

  @Column({ name: 'author_id', nullable: true })
  authorId: string;  // 로그인 사용자 (null이면 익명)

  @Column({ name: 'author_nickname', nullable: true })
  authorNickname: string;  // 로그인 사용자 닉네임

  @Column({ name: 'anonymous_name', nullable: true })
  anonymousName: string;  // 익명 사용자 이름 (입력받음)

  @Column({ name: 'parent_id', nullable: true })
  parentId: string;  // 대댓글인 경우 부모 댓글 ID

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;  // 익명 사용자 IP (관리용)

  @CreateDateColumn()
  createdAt: Date;
}
```

#### 1-3. DB 스키마 마이그레이션
```sql
-- portfolio_schema 생성
CREATE SCHEMA IF NOT EXISTS portfolio_schema;

-- projects 테이블
CREATE TABLE portfolio_schema.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  tech_stack TEXT[], -- PostgreSQL array
  github_url VARCHAR(500),
  demo_url VARCHAR(500),
  thumbnail VARCHAR(500),
  is_public BOOLEAN DEFAULT true,
  author_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- comments 테이블
CREATE TABLE portfolio_schema.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  content TEXT NOT NULL,
  author_id UUID,
  author_nickname VARCHAR(50),
  anonymous_name VARCHAR(50),
  parent_id UUID, -- 대댓글
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT now(),

  FOREIGN KEY (project_id) REFERENCES portfolio_schema.projects(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES portfolio_schema.comments(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX idx_projects_author ON portfolio_schema.projects(author_id);
CREATE INDEX idx_comments_project ON portfolio_schema.comments(project_id);
CREATE INDEX idx_comments_parent ON portfolio_schema.comments(parent_id);
```

#### 1-4. API 엔드포인트 설계
```
Portfolio Service
├── GET    /projects           # 프로젝트 목록 (공개만)
├── GET    /projects/:id       # 프로젝트 상세
├── POST   /projects           # 프로젝트 생성 (인증 필요)
├── PATCH  /projects/:id       # 프로젝트 수정 (인증 필요)
└── DELETE /projects/:id       # 프로젝트 삭제 (인증 필요)

Comment Service
├── GET    /comments/:projectId        # 댓글 목록 (대댓글 포함)
├── POST   /comments                   # 댓글 작성 (익명/로그인 구분)
└── DELETE /comments/:id               # 댓글 삭제 (본인/관리자)
```

---

### Phase 2: 프론트엔드 개발 (5-7일)

#### 2-1. 기술 스택
```
- Framework: Next.js 14 (App Router)
- Styling: Tailwind CSS + ShadcnUI
- State: React Query (서버 상태 관리)
- Markdown: react-markdown + remark-gfm
- Code Highlight: prism-react-renderer
```

#### 2-2. 페이지 구조
```
app/
├── (home)/
│   └── page.tsx              # 홈 (프로젝트 목록)
│
├── projects/
│   ├── [id]/
│   │   └── page.tsx          # 프로젝트 상세 + 댓글
│   └── new/
│       └── page.tsx          # 프로젝트 작성 (관리자)
│
├── auth/
│   ├── login/
│   │   └── page.tsx          # 로그인
│   └── signup/
│       └── page.tsx          # 회원가입
│
└── admin/
    └── page.tsx              # 관리자 대시보드
```

#### 2-3. 주요 컴포넌트
```tsx
// 프로젝트 카드
<ProjectCard
  project={project}
  showActions={isAdmin}  // 관리자만 수정/삭제 버튼
/>

// 댓글 시스템
<CommentSection projectId={id}>
  <CommentForm />        // 댓글 작성 (익명/로그인 구분)
  <CommentList>
    <Comment />          // 댓글
      <CommentReply />   // 대댓글
  </CommentList>
</CommentSection>

// Markdown 렌더러
<MarkdownRenderer content={project.content} />
```

---

### Phase 3: 배포 및 통합 (1-2일)

#### 3-1. 프론트엔드 배포 옵션

##### 옵션 A: Vercel (권장) ✅
```
장점:
- 무료 (Hobby Plan)
- Next.js 최적화
- 자동 CI/CD
- 글로벌 CDN

단점:
- 별도 도메인 (vercel.app)
```

##### 옵션 B: OCI 서버에 함께 배포
```
nginx.conf 수정:
location / {
  proxy_pass http://frontend:3000;  # Next.js
}

location /api {
  proxy_pass http://nginx-backend;  # 기존 API
}

장점:
- 단일 도메인
- 모든 리소스 통합

단점:
- 메모리 부족 가능 (1GB RAM)
- Next.js SSR 부하
```

**결론**: **Vercel 사용** (무료 + 성능 좋음)

#### 3-2. 환경 변수
```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://152.67.216.145

# Backend (기존 .env)
CORS_ORIGIN=https://your-portfolio.vercel.app
```

---

## 🎨 UI/UX 디자인 방향

### 레이아웃
```
┌─────────────────────────────────────┐
│  Header                             │
│  [Logo] [Projects] [About] [Login] │
├─────────────────────────────────────┤
│                                     │
│  Hero Section                       │
│  "안녕하세요, 백엔드 개발자 OOO입니다" │
│                                     │
├─────────────────────────────────────┤
│  Projects Grid                      │
│  ┌─────┐ ┌─────┐ ┌─────┐          │
│  │ P1  │ │ P2  │ │ P3  │          │
│  └─────┘ └─────┘ └─────┘          │
└─────────────────────────────────────┘
```

### 프로젝트 상세 페이지
```
┌─────────────────────────────────────┐
│  [← Back]                           │
│                                     │
│  # 프로젝트 제목                     │
│  [NestJS] [React] [Docker]          │
│  [GitHub] [Demo]                    │
│                                     │
│  ## 프로젝트 설명 (Markdown)        │
│  ...                                │
│                                     │
├─────────────────────────────────────┤
│  💬 댓글 (3)                        │
│                                     │
│  [댓글 작성]                         │
│  익명: [이름 입력] [내용]            │
│  로그인: [내용만]                    │
│                                     │
│  ├─ 홍길동 (익명): 좋은 프로젝트네요!│
│  │  └─ 관리자: 감사합니다!          │
│  └─ test_user: 잘 봤습니다          │
└─────────────────────────────────────┘
```

---

## 📦 구현 체크리스트

### 백엔드 (2-3일)
- [ ] `portfolio_schema` 생성 (Supabase)
- [ ] `Project` Entity 생성
- [ ] `Comment` Entity 생성
- [ ] Portfolio Service 구현
  - [ ] CRUD API
  - [ ] Redis 캐싱
  - [ ] 이미지 업로드 (선택)
- [ ] Comment Service 구현
  - [ ] 댓글 CRUD
  - [ ] 대댓글 조회 (재귀)
  - [ ] 익명/로그인 구분 로직
- [ ] CORS 설정 (Vercel 도메인)

### 프론트엔드 (5-7일)
- [ ] Next.js 프로젝트 생성
- [ ] Tailwind + ShadcnUI 설정
- [ ] API Client 설정 (axios/fetch)
- [ ] 페이지 구현
  - [ ] 홈 (프로젝트 목록)
  - [ ] 프로젝트 상세
  - [ ] 로그인/회원가입
  - [ ] 관리자 - 프로젝트 작성/수정
- [ ] 댓글 시스템
  - [ ] 댓글 작성 폼
  - [ ] 댓글 목록 (대댓글 트리)
  - [ ] 익명/로그인 구분 UI
- [ ] Markdown 렌더링
- [ ] 반응형 디자인

### 배포 (1-2일)
- [ ] 백엔드 배포 (기존 OCI)
- [ ] 프론트엔드 배포 (Vercel)
- [ ] CORS 설정 확인
- [ ] 프로덕션 테스트

---

## 🚀 빠른 시작 가이드

### 1. 백엔드 준비
```bash
# 1. 스키마 생성 (Supabase SQL Editor)
# portfolio_schema_migration.sql 실행

# 2. Portfolio Service 생성
cd board-server
nest g resource portfolio --no-spec

# 3. Comment Service 생성
nest g resource comment --no-spec

# 4. Entity 작성 (위 설계 참고)

# 5. 테스트
npm run start:dev
curl http://localhost:3000/projects
```

### 2. 프론트엔드 준비
```bash
# 1. Next.js 프로젝트 생성
npx create-next-app@latest portfolio-site
cd portfolio-site

# 2. 의존성 설치
npm install @tanstack/react-query axios
npm install react-markdown remark-gfm
npm install -D tailwindcss

# 3. 개발 서버 실행
npm run dev
```

### 3. 연동 테스트
```bash
# 프론트엔드에서 API 호출
fetch('http://152.67.216.145/projects')
  .then(res => res.json())
  .then(data => console.log(data))
```

---

## 💡 추가 고려사항

### 보안
- [ ] Rate Limiting (댓글 스팸 방지)
- [ ] XSS 방지 (댓글 입력 sanitize)
- [ ] 익명 댓글 IP 해싱

### 성능
- [ ] 프로젝트 목록 캐싱 (Redis)
- [ ] 이미지 CDN (Cloudinary/ImgIX)
- [ ] Next.js ISR (Incremental Static Regeneration)

### UX
- [ ] 로딩 스켈레톤
- [ ] 에러 바운더리
- [ ] Toast 알림
- [ ] 다크 모드 (선택)

---

## 📅 예상 일정

| Phase | 작업 | 예상 시간 |
|-------|------|----------|
| Phase 1 | 백엔드 확장 | 2-3일 |
| Phase 2 | 프론트엔드 개발 | 5-7일 |
| Phase 3 | 배포 및 통합 | 1-2일 |
| **Total** | | **8-12일** |

---

## 🎯 다음 단계

1. **DB 스키마 설계 확정** - portfolio_schema 구조 검토
2. **Entity 작성** - Project, Comment Entity
3. **API 구현 시작** - Portfolio Service부터

**준비되면 시작하시면 됩니다!** 🚀
