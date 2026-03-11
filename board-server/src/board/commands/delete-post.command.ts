import { User } from 'src/entities/user.entity';

export class DeletePostCommand {
  constructor(
    public readonly id: string,
    public readonly user: User,
  ) {}
}
