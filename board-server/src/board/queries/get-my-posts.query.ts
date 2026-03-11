import { User } from 'src/entities/user.entity';

export class GetMyPostsQuery {
  constructor(public readonly user: User) {}
}
