import { IsEmail, IsNotEmpty, IsString, MinLength,Matches } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
     message: 'Invalid Indian phone number',
   })
   phone: string;
  
}