import { NotificationsService } from "./notifications.service.js";
import { UseGuards,Get,Param,Patch,ParseIntPipe,Controller, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard.js";
import type { AuthenticatedRequest } from "../../auth/guard/jwt-auth.guard.js";
import { ApiBearerAuth } from "@nestjs/swagger";

@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  listMine(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.listMine(req.user!.sub);
  }

  @Patch(':id/read')
  markRead(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.notificationsService.markRead(id, req.user!.sub);
  }
}