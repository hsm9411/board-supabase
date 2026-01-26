
import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class SignInDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^[a-zA-Z0-9]*$/, {
    message: 'password only accepts alphanumeric characters',
  })
  password: string;
}
