import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller.js';
import { TripsService } from './trips.service.js';

/** Viajes de quien conduce (HU-20); la bitácora de salida y llegada llega con HU-21. */
@Module({
  controllers: [TripsController],
  providers: [TripsService],
})
export class TripsModule {}
