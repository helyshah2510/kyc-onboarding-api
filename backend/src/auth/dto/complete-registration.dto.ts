import { IsNotEmpty,Matches } from 'class-validator';

export class CompleteRegistrationDto {

  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
     message: 'Invalid Indian phone number',
   })
   phone: string;
  
}