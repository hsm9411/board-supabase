
import { Controller, Post, Body, Get, Param, UseGuards, ValidationPipe } from '@nestjs/common';
import { SignUpDto } from './dto/signup.dto'; // [Fix] DTO 경로 확인 및 임포트
import { SignInDto } from './dto/signin.dto'; // [Fix] DTO 경로 확인 및 임포트
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // 기존 signup, signin...
  @Post('/signup')
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({ status: 201, description: '회원가입 성공' })
  @ApiResponse({ status: 409, description: '이미 존재하는 이메일' })
  signUp(@Body() signUpDto: SignUpDto): Promise<void> {
    return this.authService.signUp(signUpDto);
  }

  @Post('/signin')
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: 201, description: '로그인 성공, Access Token 발급' })
  @ApiResponse({ status: 401, description: '로그인 정보 불일치' })
  signIn(@Body() signInDto: SignInDto): Promise<{ accessToken: string }> {
    return this.authService.signIn(signInDto);
  }

  // ✅ 새로운 API: 다른 서비스에서 User 정보 조회용
  @Get('/users/:id')
  @UseGuards(AuthGuard())
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '사용자 정보 조회 (Internal API)' })
  async getUserById(@Param('id') id: string) {
    return this.authService.getUserById(id);
  }

  @Get('/users/email/:email')
  @UseGuards(AuthGuard())
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '이메일로 사용자 조회 (Internal API)' })
  async getUserByEmail(@Param('email') email: string) {
    return this.authService.getUserByEmail(email);
  }
}