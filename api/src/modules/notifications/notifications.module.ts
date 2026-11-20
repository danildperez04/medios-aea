import { Module } from '@nestjs/common';
import { NotificationInboxService } from './notification-inbox.service.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { PushDispatcher } from './push-dispatcher.service.js';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationInboxService, PushDispatcher],
  exports: [NotificationsService],
})
export class NotificationsModule {}
