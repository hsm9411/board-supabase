
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { ILike, Repository } from 'typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { Post } from 'src/entities/post.entity';

@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
  ) {}

  async createPost(createPostDto: CreatePostDto, user: User): Promise<Post> {
    const { title, content } = createPostDto;

    const post = this.postRepository.create({
      title,
      content,
      author: user,
    });

    await this.postRepository.save(post);
    return post;
  }

  async getPosts(page: number, limit: number, search: string) {
    const query = this.postRepository.createQueryBuilder('post');

    if (search) {
      // LIKE -> ILIKE로 변경 (Postgres 전용)
      query.where(
        'post.title ILIKE :search OR post.content ILIKE :search',
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

  // 수정
  async getPostById(id: number): Promise<Post> {
    // 👇 relations 옵션을 추가해서 작성자 정보를 같이 가져와야 합니다.
    const found = await this.postRepository.findOne({ 
      where: { id },
      relations: ['author'] // 이 부분이 핵심입니다!
    });

    if (!found) {
      throw new NotFoundException(`Post with ID "${id}" not found`);
    }

    return found;
  }

  async updatePost(
    id: number,
    createPostDto: CreatePostDto,
    user: User,
  ): Promise<Post> {
    const post = await this.getPostById(id);

    if (post.author.id !== user.id) {
      throw new NotFoundException('You are not the author of this post');
    }

    post.title = createPostDto.title;
    post.content = createPostDto.content;

    await this.postRepository.save(post);
    return post;
  }

  async deletePost(id: number, user: User): Promise<void> {
    const result = await this.postRepository.delete({ id, author: { id: user.id } });

    if (result.affected === 0) {
      throw new NotFoundException(`Post with ID "${id}" not found`);
    }
  }
}
