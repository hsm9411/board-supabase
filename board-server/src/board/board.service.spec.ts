import { Test, TestingModule } from '@nestjs/testing';
import { BoardService } from './board.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Post } from '../entities/post.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('BoardService', () => {
  let service: BoardService;
  let mockPostRepository: any;
  let mockCacheManager: any;

  beforeEach(async () => {
    mockPostRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      })),
    };

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardService,
        {
          provide: getRepositoryToken(Post),
          useValue: mockPostRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<BoardService>(BoardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPost', () => {
    it('should create a new post', async () => {
      const createPostDto = {
        title: 'Test Post',
        content: 'Test Content',
        isPublic: true,
      };

      const user = {
        id: 'user-uuid',
        email: 'test@example.com',
        nickname: '테스터',
        createdAt: new Date(),
      };

      mockPostRepository.create.mockReturnValue({
        id: 'post-uuid',
        ...createPostDto,
        authorId: user.id,
      });
      mockPostRepository.save.mockResolvedValue({});

      const result = await service.createPost(createPostDto, user);

      expect(mockPostRepository.create).toHaveBeenCalled();
      expect(mockPostRepository.save).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  describe('getPosts', () => {
    it('should return cached posts if available', async () => {
      const cachedData = {
        data: [],
        total: 0,
        page: 1,
        last_page: 1,
      };

      mockCacheManager.get.mockResolvedValue(cachedData);

      const result = await service.getPosts({ page: 1, limit: 10 });

      expect(result).toEqual(cachedData);
      expect(mockPostRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should fetch from DB on cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      await service.getPosts({ page: 1, limit: 10 });

      expect(mockPostRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });
});
