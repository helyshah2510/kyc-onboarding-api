import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty,IsString,MaxLength } from "class-validator";

export class RejectApplicationDto{
    @ApiProperty({example:'Aadhaar is not clear'})
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    reason:string;
}