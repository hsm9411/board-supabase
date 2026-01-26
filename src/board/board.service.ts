
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { ILike, Repository } from 'typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { Post } from 'src/entities/post.entity';
import { GetPostsDto } from './dto/get-posts.dto';

@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
  ) {}

  async createPost(createPostDto: CreatePostDto, user: User): Promise<Post> {
    const { title, content, isPublic } = createPostDto;

    const post = this.postRepository.create({
      title,
      content,
      isPublic: isPublic ?? true,
      author: user,
    });

    await this.postRepository.save(post);
    return post;
  }

  async getPosts(getPostsDto: GetPostsDto) {
    const { page, limit, search } = getPostsDto;
    const query = this.postRepository.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.is_public = :isPublic', { isPublic: true });

    if (search) {
      // search condition should be ANDed with is_public
      // LIKE -> ILIKE로 변경 (Postgres 전용)
      query.andWhere(
        '(post.title ILIKE :search OR post.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [posts, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: posts,
      total,
      page,
      last_page: Math.ceil(total / limit),
    };
  }

  async getMyPosts(user: User): Promise<Post[]> {
    return this.postRepository.find({
      where: { author: { id: user.id } },
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPostById(id: string, user?: User): Promise<Post> {
    const found = await this.postRepository.findOne({ 
      where: { id },
      relations: ['author']
    });

    if (!found) {
      throw new NotFoundException(`Post with ID "${id}" not found`);
    }

    // 비공개 글인 경우 작성자 본인만 확인 가능
    if (!found.isPublic && (!user || found.author.id !== user.id)) {
      throw new ForbiddenException('This post is private');
    }

    return found;
  }

  async updatePost(
    id: string,
    createPostDto: CreatePostDto,
    user: User,
  ): Promise<Post> {
    const post = await this.getPostById(id);

    if (post.author.id !== user.id) {
      throw new ForbiddenException('You are not the author of this post');
    }

    const { title, content, isPublic } = createPostDto;
    post.title = title;
    post.content = content;
    if (isPublic !== undefined) {
      post.isPublic = isPublic;
    }

    await this.postRepository.save(post);
    return post;
  }

  async deletePost(id: string, user: User): Promise<void> {
    const result = await this.postRepository.delete({ id, author: { id: user.id } });

    if (result.affected === 0) {
      throw new NotFoundException(`Post with ID "${id}" not found`);
    }
  }
}
