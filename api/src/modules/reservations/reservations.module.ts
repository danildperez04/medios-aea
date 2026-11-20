import { Module } from '@nestjs/common';
import { NotificationsModule } from '#modules/notifications/notifications.module.js';
import { AssignmentChecker } from './assignment-checker.js';
import { ReservationHistoryService } from './reservation-history.service.js';
import { ReservationNotices } from './reservation-notices.js';
import { ReservationQueries } from './reservation-queries.js';
import { ReservationsController } from './reservations.controller.js';
import { ReservationsService } from './reservations.service.js';
import { RequestParties } from './request-parties.js';

@Module({
  imports: [NotificationsModule],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    ReservationHistoryService,
    AssignmentChecker,
    ReservationNotices,
    RequestParties,
    ReservationQueries,
  ],
  // AssignmentChecker se exporta para la bitácora de viajes (HU-21).
  exports: [ReservationsService, AssignmentChecker],
})
export class ReservationsModule {}
