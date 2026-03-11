import { UpdatePostDto } from '../dto/update-post.dto';
import { User } from 'src/entities/user.entity';

export class UpdatePostCommand {
  constructor(
    public readonly id: string,
    public readonly dto: UpdatePostDto,
    public readonly user: User,
  ) {}
}
