import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Post } from 'src/entities/post.entity';
import { UpdatePostCommand } from '../update-post.command';

@CommandHandler(UpdatePostCommand)
export class UpdatePostHandler implements ICommandHandler<UpdatePostCommand> {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async execute(command: UpdatePostCommand): Promise<Post> {
    const { id, dto, user } = command;

    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== user.id) throw new ForbiddenException('You can only update your own posts');

    if (dto.title !== undefined) post.title = dto.title;
    if (dto.content !== undefined) post.content = dto.content;
    if (dto.isPublic !== undefined) post.isPublic = dto.isPublic;

    await this.postRepository.save(post);
    await this.cacheManager.del(`post:${id}`);
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
