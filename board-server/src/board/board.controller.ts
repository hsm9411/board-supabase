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
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/entities/user.entity';
import { BoardService } from './board.service';
import { CreatePostDto } from './dto/create-post.dto';
import { GetPostsDto } from './dto/get-posts.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('board')
@ApiBearerAuth('access-token')
@Controller('board')
export class BoardController {
  constructor(private boardService: BoardService) {}

  @Post()
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: '게시글 작성' })
  @ApiResponse({ status: 201, description: '작성 성공' })
  createPost(@Body() createPostDto: CreatePostDto, @GetUser() user: User) {
    return this.boardService.createPost(createPostDto, user);
  }

  @Get()
  @ApiOperation({ summary: '전체 게시글 조회 (페이징, 검색)' })
  getPosts(@Query() getPostsDto: GetPostsDto) {
    return this.boardService.getPosts(getPostsDto);
  }

  @Get('/my')
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: '내가 쓴 게시글 조회' })
  getMyPosts(@GetUser() user: User) {
    return this.boardService.getMyPosts(user);
  }

  @Get('/:id')
  @ApiOperation({ summary: '게시글 상세 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없음' })
  getPostById(@Param('id') id: string, @GetUser() user?: User) {
    return this.boardService.getPostById(id, user);
  }

  @Patch('/:id')
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: '게시글 수정' })
  @ApiResponse({ status: 200, description: '수정 성공' })
  @ApiResponse({ status: 403, description: '수정 권한 없음' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없음' })
  updatePost(@Param('id') id: string, @Body() createPostDto: CreatePostDto, @GetUser() user: User) {
    return this.boardService.updatePost(id, createPostDto, user);
  }

  @Delete('/:id')
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: '게시글 삭제' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없거나 권한 없음' })
  deletePost(@Param('id') id: string, @GetUser() user: User) {
    return this.boardService.deletePost(id, user);
  }
}
