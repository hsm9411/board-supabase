
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ description: '게시글 제목', example: '안녕하세요' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100) // 100자 제한
  title: string;

  @ApiProperty({ description: '게시글 내용', example: '반갑습니다.' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: '공개 여부', example: true, default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
