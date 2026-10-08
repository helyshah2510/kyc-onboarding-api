import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty,Matches } from "class-validator";

export class RequestLoginDto{

    @ApiProperty({example:'999999999',description:'Registered phone number'})
    @IsNotEmpty()
    @Matches(/^[6-9]\d{9}$/, {message:'Invalid indian phone number'})
    phone:string;
}