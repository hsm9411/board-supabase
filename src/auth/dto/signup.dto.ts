
import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({ description: '이메일 주소', example: 'test@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: '비밀번호 (최소 8자, 영문/숫자)', example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^[a-zA-Z0-9]*$/, {
    message: 'password only accepts alphanumeric characters',
  })
  password: string;

  @ApiProperty({ description: '닉네임', example: '길동이' })
  @IsString()
  @IsNotEmpty()
  nickname: string;
}
