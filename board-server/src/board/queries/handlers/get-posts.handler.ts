import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import { Post } from 'src/entities/post.entity';
import { GetPostsQuery } from '../get-posts.query';

@QueryHandler(GetPostsQuery)
export class GetPostsHandler implements IQueryHandler<GetPostsQuery> {
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

  async execute(query: GetPostsQuery) {
    const { page, limit, search } = query.dto;
    const version = (await this.cacheManager.get<number>('posts:version')) ?? 0;
    const cacheKey = `posts:v${version}:page=${page}:limit=${limit}:search=${search || 'none'}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.cacheHits.inc({ type: 'post_list' });  // ← 로그 대신 메트릭
      return cached;
    }

    this.cacheMisses.inc({ type: 'post_list' });  // ← 로그 대신 메트릭

    const q = this.postRepository
      .createQueryBuilder('post')
      .where('post.is_public = :isPublic', { isPublic: true })
      .orderBy('post.created_at', 'DESC');

    if (search) {
      q.andWhere('(post.title ILIKE :search OR post.content ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    const [posts, total] = await q
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const result = { data: posts, total, page, last_page: Math.ceil(total / limit) };
    await this.cacheManager.set(cacheKey, result, 10 * 60 * 1000);
    return result;
  }
}
