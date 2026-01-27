
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Post } from 'src/entities/post.entity';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';


@Module({
  imports: [TypeOrmModule.forFeature([Post]), AuthModule],
  controllers: [BoardController],
  providers: [BoardService],
})
export class BoardModule {}
