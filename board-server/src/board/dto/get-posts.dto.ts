import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetPostsDto {
  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: '페이지당 항목 수 (1~100)', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100) // limit에 상한 없으면 ?limit=99999 요청 시 DB가 전체 로우를 처리해야 함
  limit: number = 10;

  @ApiPropertyOptional({ description: '검색어 (제목 또는 내용)' })
  @IsOptional()
  @IsString()
  search?: string;
}
