import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/entities/user.entity';
import { CreatePostCommand } from './commands/create-post.command';
import { UpdatePostCommand } from './commands/update-post.command';
import { DeletePostCommand } from './commands/delete-post.command';
import { GetPostsQuery } from './queries/get-posts.query';
import { GetPostByIdQuery } from './queries/get-post-by-id.query';
import { GetMyPostsQuery } from './queries/get-my-posts.query';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { GetPostsDto } from './dto/get-posts.dto';

@ApiTags('board')
@ApiBearerAuth('access-token')
@Controller('board')
export class BoardController {
  // BoardService 대신 CommandBus, QueryBus를 주입
  // Controller는 이제 dispatch만 담당. 비즈니스 로직이 전혀 없음.
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: '게시글 작성' })
  @ApiResponse({ status: 201, description: '작성 성공' })
  createPost(@Body() createPostDto: CreatePostDto, @GetUser() user: User) {
    // Command: 상태를 변경하는 요청
    return this.commandBus.execute(new CreatePostCommand(createPostDto, user));
  }

  @Get()
  @ApiOperation({ summary: '전체 게시글 조회 (페이징, 검색)' })
  getPosts(@Query() getPostsDto: GetPostsDto) {
    // Query: 상태를 읽는 요청
    return this.queryBus.execute(new GetPostsQuery(getPostsDto));
  }

  @Get('/my')
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: '내가 쓴 게시글 조회' })
  getMyPosts(@GetUser() user: User) {
    return this.queryBus.execute(new GetMyPostsQuery(user));
  }

  @Get('/:id')
  @ApiOperation({ summary: '게시글 상세 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없음' })
  getPostById(@Param('id') id: string, @GetUser() user?: User) {
    return this.queryBus.execute(new GetPostByIdQuery(id, user));
  }

  @Patch('/:id')
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: '게시글 수정 (부분 업데이트 가능)' })
  @ApiResponse({ status: 200, description: '수정 성공' })
  @ApiResponse({ status: 403, description: '수정 권한 없음' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없음' })
  updatePost(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto, @GetUser() user: User) {
    return this.commandBus.execute(new UpdatePostCommand(id, updatePostDto, user));
  }

  @Delete('/:id')
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: '게시글 삭제' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없거나 권한 없음' })
  deletePost(@Param('id') id: string, @GetUser() user: User) {
    return this.commandBus.execute(new DeletePostCommand(id, user));
  }
}
