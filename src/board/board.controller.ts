
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/entities/user.entity';
import { BoardService } from './board.service';
import { CreatePostDto } from './dto/create-post.dto';

@Controller('board')
@UseGuards(AuthGuard())
export class BoardController {
  constructor(private boardService: BoardService) {}

  @Post()
  createPost(
    @Body(ValidationPipe) createPostDto: CreatePostDto,
    @GetUser() user: User,
  ) {
    return this.boardService.createPost(createPostDto, user);
  }

  @Get()
  getPosts(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('search') search: string,
  ) {
    return this.boardService.getPosts(page, limit, search);
  }

  @Get('/:id')
  getPostById(@Param('id', ParseIntPipe) id: number) {
    return this.boardService.getPostById(id);
  }

  @Patch('/:id')
  updatePost(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) createPostDto: CreatePostDto,
    @GetUser() user: User,
  ) {
    return this.boardService.updatePost(id, createPostDto, user);
  }

  @Delete('/:id')
  deletePost(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.boardService.deletePost(id, user);
  }
}
