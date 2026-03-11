import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import { Post } from 'src/entities/post.entity';
import { GetPostByIdQuery } from '../get-post-by-id.query';

@QueryHandler(GetPostByIdQuery)
export class GetPostByIdHandler implements IQueryHandler<GetPostByIdQuery> {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    @InjectMetric('cache_hits_total')
    private cacheHits: Counter<string>,
    @InjectMetric('cache_misses_total')
    private cacheMisses: Counter<string>,
  ) {}

  async execute(query: GetPostByIdQuery): Promise<Post> {
    const { id, user } = query;
    const cacheKey = `post:${id}`;

    const cached = await this.cacheManager.get<Post>(cacheKey);
    if (cached) {
      this.cacheHits.inc({ type: 'post_detail' });
      if (!cached.isPublic && (!user || cached.authorId !== user.id)) {
        throw new ForbiddenException('This post is private');
      }
      return cached;
    }

    this.cacheMisses.inc({ type: 'post_detail' });

    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!post.isPublic && (!user || post.authorId !== user.id)) {
      throw new ForbiddenException('This post is private');
    }

    await this.cacheManager.set(cacheKey, post, 30 * 60 * 1000);
    return post;
  }
}
