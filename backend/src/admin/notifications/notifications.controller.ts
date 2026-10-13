import { NotificationsService } from "./notifications.service.js";
import { UseGuards,Get,Param,Patch,ParseIntPipe,Controller, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard.js";
import { ApiBearerAuth } from "@nestjs/swagger";

type AuthRequest = { user: { id: number } };

@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  listMine(@Req() req:AuthRequest) {
    return this.notificationsService.listMine(req.user.id);
  }

  @Patch(':id/read')
  markRead(
    @Param('id', ParseIntPipe) id: number,
    @Req() req:AuthRequest,
  ) {
    return this.notificationsService.markRead(id, req.user.id);
  }
}