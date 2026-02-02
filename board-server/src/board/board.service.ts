import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
// 'type' 키워드를 추가하세요
import type { Cache } from 'cache-manager';
import { Post } from '../entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { GetPostsDto } from './dto/get-posts.dto';
import { User } from '../entities/user.entity';

interface CachedUserData {
  id: string;
  email: string;
  nickname: string;
}

// ✅ 개선: 상수로 명확하게 정의
const CACHE_TTL = {
  USER: 60 * 60 * 1000,      // 1시간
  POST_LIST: 10 * 60 * 1000,  // 10분
  POST_DETAIL: 30 * 60 * 1000 // 30분
};

@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  /**
   * 게시글 생성 (Redis에 User 정보 캐싱)
   */
  async createPost(createPostDto: CreatePostDto, user: User): Promise<Post> {
    const { title, content, isPublic } = createPostDto;

    // User 정보를 Redis에 캐싱 (1시간 TTL)
    const cacheKey = `user:${user.id}`;
    // createPost 메서드 내부 수정
    await this.cacheManager.set(
      cacheKey,
      {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      },
      CACHE_TTL.USER, // ← 변경
    );

    const post = this.postRepository.create({
      title,
      content,
      isPublic: isPublic ?? true,
      authorId: user.id,
      authorEmail: user.email,
      authorNickname: user.nickname,
    });

    await this.postRepository.save(post);
    
    // 게시글 목록 캐시 무효화
    await this.invalidatePostsCache();
    
    return post;
  }

  /**
   * 공개 게시글 목록 조회 (Redis 캐싱)
   */
  async getPosts(getPostsDto: GetPostsDto) {
    const { page, limit, search } = getPostsDto;
    const cacheKey = `posts:page=${page}:limit=${limit}:search=${search || 'none'}`;

    // 1. Redis에서 캐싱된 데이터 확인
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      console.log('[Cache Hit] Posts list from Redis');
      return cached;
    }

    // 2. Cache Miss → DB 조회
    console.log('[Cache Miss] Fetching from DB');
    const query = this.postRepository
      .createQueryBuilder('post')
      .where('post.is_public = :isPublic', { isPublic: true })
      .orderBy('post.created_at', 'DESC');

    if (search) {
      query.andWhere(
        '(post.title ILIKE :search OR post.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [posts, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const result = {
      data: posts,
      total,
      page,
      last_page: Math.ceil(total / limit),
    };

    // 3. Redis에 캐싱 (10분 TTL)
    await this.cacheManager.set(cacheKey, result, CACHE_TTL.POST_LIST);

    return result;
  }

  /**
   * 게시글 상세 조회 (Redis 캐싱)
   */
  async getPostById(id: string, user?: User): Promise<Post> {
    const cacheKey = `post:${id}`;

    // 1. Redis 확인
    const cached = await this.cacheManager.get<Post>(cacheKey);
    if (cached) {
      console.log('[Cache Hit] Post detail from Redis');
      if (!cached.isPublic && (!user || cached.authorId !== user.id)) {
        throw new ForbiddenException('This post is private');
      }
      return cached;
    }

    // 2. DB 조회
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!post.isPublic && (!user || post.authorId !== user.id)) {
      throw new ForbiddenException('This post is private');
    }

    // 3. Redis 캐싱 (30분 TTL)
    await this.cacheManager.set(cacheKey, post, CACHE_TTL.POST_DETAIL);

    return post;
  }

  /**
   * 게시글 수정 (캐시 무효화)
   */
  async updatePost(
    id: string,
    updateDto: CreatePostDto,
    user: User,
  ): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== user.id) {
      throw new ForbiddenException('You can only update your own posts');
    }

    post.title = updateDto.title;
    post.content = updateDto.content;
    if (updateDto.isPublic !== undefined) {
      post.isPublic = updateDto.isPublic;
    }

    await this.postRepository.save(post);

    // 관련 캐시 무효화
    await this.cacheManager.del(`post:${id}`);
    await this.invalidatePostsCache();

    return post;
  }

  /**
   * 게시글 삭제 (캐시 무효화)
   */
  async deletePost(id: string, user: User): Promise<void> {
    const post = await this.postRepository.findOne({ where: { id } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== user.id) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.postRepository.remove(post);

    // 관련 캐시 무효화
    await this.cacheManager.del(`post:${id}`);
    await this.invalidatePostsCache();
  }

  private async invalidatePostsCache(): Promise<void> {
    // cacheManager를 먼저 any로 만들어서 강제로 store를 꺼냄
    const store = (this.cacheManager as any).store;
    
    // ✅ Redis client 접근 방식 검증
    if (!store || typeof store.client?.scan !== 'function') {
      console.warn('[Cache] Redis SCAN not available, skipping invalidation');
      return;
    }
    
    const client = store.client;
    let cursor = '0';
    let deletedCount = 0;
    
    do {
      const [newCursor, keys] = await client.scan(
        cursor,
        'MATCH',
        'posts:*',
        'COUNT',
        100,
      );
      
      cursor = newCursor;
      
      if (keys.length > 0) {
        await client.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== '0');
    
    if (deletedCount > 0) {
      console.log(`[Cache] Invalidated ${deletedCount} post list caches`);
    }
  }

  /**
   * 내가 쓴 게시글 조회 (캐싱 미적용 - 개인화 데이터)
   */
  async getMyPosts(user: User) {
    const posts = await this.postRepository.find({
      where: { authorId: user.id },
      order: { createdAt: 'DESC' },
    });

    return { data: posts, total: posts.length };
  }
}