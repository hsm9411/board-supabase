import { CreatePostDto } from '../dto/create-post.dto';
import { User } from 'src/entities/user.entity';

export class CreatePostCommand {
  constructor(
    public readonly dto: CreatePostDto,
    public readonly user: User,
  ) {}
}
