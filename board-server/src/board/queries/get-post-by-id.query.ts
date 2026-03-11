import { User } from 'src/entities/user.entity';

export class GetPostByIdQuery {
  constructor(
    public readonly id: string,
    public readonly user?: User,
  ) {}
}
