
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100) // 100자 제한
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
