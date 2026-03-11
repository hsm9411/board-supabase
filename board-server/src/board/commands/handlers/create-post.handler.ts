import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Post } from 'src/entities/post.entity';
import { CreatePostCommand } from '../create-post.command';

@CommandHandler(CreatePostCommand)
export class CreatePostHandler implements ICommandHandler<CreatePostCommand> {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async execute(command: CreatePostCommand): Promise<Post> {
    const { dto, user } = command;

    // User 정보 캐싱 (1시간)
    await this.cacheManager.set(
      `user:${user.id}`,
      { id: user.id, email: user.email, nickname: user.nickname },
      60 * 60 * 1000,
    );

    const post = this.postRepository.create({
      title: dto.title,
      content: dto.content,
      isPublic: dto.isPublic ?? true,
      authorId: user.id,
      authorEmail: user.email,
      authorNickname: user.nickname,
    });

    await this.postRepository.save(post);
    await this.invalidatePostsCache();
    return post;
  }

  private async invalidatePostsCache(): Promise<void> {
    const VERSION_KEY = 'posts:version';
    const current = (await this.cacheManager.get<number>(VERSION_KEY)) ?? 0;
    await this.cacheManager.set(VERSION_KEY, current + 1, 0);
    console.log(`[Cache] Post list version bumped to ${current + 1}`);
  }
}
