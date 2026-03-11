import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from 'src/auth/auth.module';
import { Post } from 'src/entities/post.entity';
import { BoardController } from './board.controller';

// Command Handlers
import { CreatePostHandler } from './commands/handlers/create-post.handler';
import { UpdatePostHandler } from './commands/handlers/update-post.handler';
import { DeletePostHandler } from './commands/handlers/delete-post.handler';

// Query Handlers
import { GetPostsHandler } from './queries/handlers/get-posts.handler';
import { GetPostByIdHandler } from './queries/handlers/get-post-by-id.handler';
import { GetMyPostsHandler } from './queries/handlers/get-my-posts.handler';

const CommandHandlers = [CreatePostHandler, UpdatePostHandler, DeletePostHandler];
const QueryHandlers = [GetPostsHandler, GetPostByIdHandler, GetMyPostsHandler];

@Module({
  imports: [
    CqrsModule,           // CommandBus, QueryBus 제공
    TypeOrmModule.forFeature([Post]),
    AuthModule,
  ],
  controllers: [BoardController],
  // BoardService 제거. 핸들러들이 그 역할을 각각 담당.
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class BoardModule {}
