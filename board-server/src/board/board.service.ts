import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../entities/post.entity';
import { CachedUser } from '../entities/cached-user.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { AuthClientService } from '../auth/auth-client.service';
import { User } from '../entities/user.entity';

@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(CachedUser)
    private cachedUserRepository: Repository<CachedUser>,
    private authClientService: AuthClientService,
  ) {}

  async createPost(createPostDto: CreatePostDto, user: User, token: string): Promise<Post> {
    const { title, content, isPublic } = createPostDto;

    // User 정보를 캐시 테이블에 저장/업데이트
    await this.syncUserCache(user.id, token);

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

  async getPosts(getPostsDto: GetPostsDto) {
    const { page, limit, search } = getPostsDto;
    const query = this.postRepository.createQueryBuilder('post')
      .where('post.is_public = :isPublic', { isPublic: true });

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

  // User 캐시 동기화
  private async syncUserCache(userId: string, token: string): Promise<void> {
    try {
      const cachedUser = await this.cachedUserRepository.findOne({ where: { id: userId } });
      
      // 캐시가 없거나 1시간 이상 지났으면 갱신
      const shouldSync = !cachedUser || 
        (Date.now() - cachedUser.lastSyncedAt.getTime()) > 3600000;

      if (shouldSync) {
        const userInfo = await this.authClientService.getUserById(userId, token);
        
        await this.cachedUserRepository.save({
          id: userInfo.id,
          email: userInfo.email,
          nickname: userInfo.nickname,
        });
      }
    } catch (error) {
      console.error('Failed to sync user cache:', error);
      // 캐시 실패해도 서비스는 계속 진행
    }
  }
}