import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from 'src/entities/post.entity';
import { GetMyPostsQuery } from '../get-my-posts.query';

@QueryHandler(GetMyPostsQuery)
export class GetMyPostsHandler implements IQueryHandler<GetMyPostsQuery> {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
  ) {}

  async execute(query: GetMyPostsQuery) {
    const posts = await this.postRepository.find({
      where: { authorId: query.user.id },
      order: { createdAt: 'DESC' },
    });

    return { data: posts, total: posts.length };
  }
}
