import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../entities/post.entity';
import { CachedUser } from '../entities/cached-user.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { GetPostsDto } from './dto/get-posts.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(CachedUser)
    private cachedUserRepository: Repository<CachedUser>,
  ) {}

  /**
   * 게시글 생성
   * User 정보를 비정규화하여 Post에 직접 저장
   */
  async createPost(createPostDto: CreatePostDto, user: User): Promise<Post> {
    const { title, content, isPublic } = createPostDto;

    // User 캐시 동기화 (비동기, 실패해도 무관)
    this.syncUserCacheAsync(user.id, user.email, user.nickname);

    const post = this.postRepository.create({
      title,
      content,
      isPublic: isPublic ?? true,
      authorId: user.id,
      authorEmail: user.email,
      authorNickname: user.nickname,
    });

    await this.postRepository.save(post);
    return post;
  }

  /**
   * 공개 게시글 목록 조회 (페이징, 검색)
   */
  async getPosts(getPostsDto: GetPostsDto) {
    const { page, limit, search } = getPostsDto;
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

    return {
      data: posts,
      total,
      page,
      last_page: Math.ceil(total / limit),
    };
  }

  /**
   * 내가 쓴 게시글 조회
   */
  async getMyPosts(user: User) {
    const posts = await this.postRepository.find({
      where: { authorId: user.id },
      order: { createdAt: 'DESC' },
    });

    return { data: posts, total: posts.length };
  }

  /**
   * 게시글 상세 조회
   * - 공개 글: 누구나 조회 가능
   * - 비공개 글: 작성자만 조회 가능
   */
  async getPostById(id: string, user?: User): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // 비공개 글인 경우 권한 검증
    if (!post.isPublic) {
      if (!user || post.authorId !== user.id) {
        throw new ForbiddenException('This post is private');
      }
    }

    return post;
  }

  /**
   * 게시글 수정 (작성자만)
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
    return post;
  }

  /**
   * 게시글 삭제 (작성자만)
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
  }

  /**
   * User 캐시 비동기 동기화
   * 실패해도 메인 로직에 영향 없음
   */
  private syncUserCacheAsync(
    userId: string,
    email: string,
    nickname: string,
  ): void {
    setImmediate(async () => {
      try {
        const cachedUser = await this.cachedUserRepository.findOne({
          where: { id: userId },
        });

        const shouldSync =
          !cachedUser ||
          Date.now() - cachedUser.lastSyncedAt.getTime() > 3600000;

        if (shouldSync) {
          await this.cachedUserRepository.save({
            id: userId,
            email,
            nickname,
          });
        }
      } catch (error) {
        console.error('Failed to sync user cache:', error);
      }
    });
  }
}