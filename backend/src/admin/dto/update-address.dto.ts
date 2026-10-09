import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty,IsString,MaxLength } from "class-validator";

export class UpdateAddressDto{
    @ApiProperty({example:'test address'})
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsNotEmpty()
    @IsString()
    @MaxLength(300)
    address:string
}