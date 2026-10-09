import { Injectable, Logger } from "@nestjs/common";

type Recipient ={name:string; email:string; phone:string};

@Injectable()
export class NotificationsService{
    private readonly logger= new Logger(NotificationsService.name);

    //placeholder later we can change it 

    send(to:Recipient,message:string){
        this.logger.log(`[Notify] to [to.name] (${to.email}, ${to.phone}: ${message})`);
    }
}