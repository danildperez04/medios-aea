import { Module } from '@nestjs/common';
import { AgendaController, AvailabilityController } from './availability.controller.js';
import { AvailabilityService } from './availability.service.js';

@Module({
  controllers: [AvailabilityController, AgendaController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
