import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entities/user.entity';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepository: any;
  let mockJwtService: any;

  beforeEach(async () => {
    mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signUp', () => {
    it('should create a new user', async () => {
      const signUpDto = {
        email: 'test@example.com',
        password: 'password123',
        nickname: '테스터',
      };

      mockUserRepository.create.mockReturnValue({
        id: 'uuid',
        ...signUpDto,
      });
      mockUserRepository.save.mockResolvedValue(undefined);

      await service.signUp(signUpDto);

      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const signUpDto = {
        email: 'test@example.com',
        password: 'password123',
        nickname: '테스터',
      };

      mockUserRepository.save.mockRejectedValue({ code: '23505' });

      await expect(service.signUp(signUpDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('signIn', () => {
    it('should return access token on valid credentials', async () => {
      const signInDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash('password123', 10);
      mockUserRepository.findOne.mockResolvedValue({
        id: 'uuid',
        email: 'test@example.com',
        password: hashedPassword,
      });

      mockJwtService.sign.mockReturnValue('test-token');

      const result = await service.signIn(signInDto);

      expect(result).toEqual({ accessToken: 'test-token' });
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.signIn({ email: 'wrong@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
