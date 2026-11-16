import { Module } from '@nestjs/common';
import { NotificationsModule } from '#modules/notifications/notifications.module.js';
import { ReservationHistoryService } from './reservation-history.service.js';
import { ReservationsController } from './reservations.controller.js';
import { ReservationsService } from './reservations.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationHistoryService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
