import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards,StreamableFile, UseInterceptors, UploadedFile} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service.js';
import { RejectApplicationDto } from './dto/reject-application.dto.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guard/roles.guard.js';
import { Roles } from '../auth/decorator/roles.decorator.js';
import { Query } from '@nestjs/common';
import { ListApplicationsQueryDto } from './dto/list-applications-query.dto.js';
import { createReadStream } from 'node:fs';
import { UpdateAddressDto } from './dto/update-address.dto.js';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/applications')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get()
    list(@Query() query: ListApplicationsQueryDto) {
        return this.adminService.listApplications(query.status);
    }

    @Get(':id')
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.getApplication(id);
    }

    @Get(':id/documents')
    @ApiProduces('image/png')
    async getDocument(@Param('id',ParseIntPipe)id:number){
        const document= await this.adminService.getAadhaarDocument(id);
        const file= createReadStream(document.filePath);
        return new StreamableFile(file,{
            type:'image/png',
            disposition:`inline; filename="${document.fileName} "`,
        });
    }

    @Patch(':id/approve')
    approve(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.approve(id);
    }

    @Patch(':id/reject')
    reject(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: RejectApplicationDto,
    ) {
        return this.adminService.reject(id, dto.reason);
    }

    @Patch(':id/address')
    updateAddress(
        @Param('id',ParseIntPipe)id:number,
        @Body()dto:UpdateAddressDto,
    ){
        return this.adminService.updateAddress(id,dto.address);
    }

    @Patch(':id/documents')
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema:{
            type:'object',
            properties:{
                file:{type:'string',format:'binary'},
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    replaceDocument(
        @Param('id',ParseIntPipe) id:number,
        @UploadedFile()file:Express.Multer.File,
    ){
        return this.adminService.replaceDocuments(id,file);
    }
}