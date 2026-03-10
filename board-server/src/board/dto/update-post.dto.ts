import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * UpdatePostDto — PATCH /board/:id 전용
 *
 * CreatePostDto와 분리한 이유:
 * - PATCH는 부분 업데이트가 원칙이므로 모든 필드가 optional이어야 함
 * - CreatePostDto를 재사용하면 IsNotEmpty() 때문에 title/content 필수가 되어
 *   부분 수정이 불가능해짐 (의미론적으로도 틀림)
 * - Swagger 문서에서도 Create/Update가 동일하게 보이는 문제 해결
 */
export class UpdatePostDto {
  @ApiPropertyOptional({ description: '게시글 제목', example: '수정된 제목' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ description: '게시글 내용', example: '수정된 내용입니다.' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '공개 여부', example: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
