import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Post } from 'src/entities/post.entity';
import { DeletePostCommand } from '../delete-post.command';

@CommandHandler(DeletePostCommand)
export class DeletePostHandler implements ICommandHandler<DeletePostCommand> {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async execute(command: DeletePostCommand): Promise<void> {
    const { id, user } = command;

    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== user.id) throw new ForbiddenException('You can only delete your own posts');

    await this.postRepository.remove(post);
    await this.cacheManager.del(`post:${id}`);
    await this.invalidatePostsCache();
  }

  private async invalidatePostsCache(): Promise<void> {
    const VERSION_KEY = 'posts:version';
    const current = (await this.cacheManager.get<number>(VERSION_KEY)) ?? 0;
    await this.cacheManager.set(VERSION_KEY, current + 1, 0);
    console.log(`[Cache] Post list version bumped to ${current + 1}`);
  }
}
