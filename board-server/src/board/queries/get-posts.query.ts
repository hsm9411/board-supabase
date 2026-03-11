import { GetPostsDto } from '../dto/get-posts.dto';

export class GetPostsQuery {
  constructor(public readonly dto: GetPostsDto) {}
}
