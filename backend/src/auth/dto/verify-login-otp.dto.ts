import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty,IsString,Matches } from "class-validator";

export class VerifyLoginOtpDto{
    @ApiProperty({example:'9999999999'})
    @IsNotEmpty()
    @Matches(/^[6-9]\d{9}$/, {message:'Invalid indian phone number'})
    phone:string;

    @ApiProperty({example:'123456', description:'Otp must of 6 letters'})
    @Transform(({value})=>(typeof value ==='string'? value.trim():value))
    @IsNotEmpty()
    @IsString()
    @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
    otp:string
}