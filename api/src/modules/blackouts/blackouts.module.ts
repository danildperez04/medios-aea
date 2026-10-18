import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from '#modules/resources/entities/resource.entity.js';
import { BlackoutsController } from './blackouts.controller.js';
import { BlackoutsService } from './blackouts.service.js';
import { Blackout } from './entities/blackout.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Blackout, Resource])],
  controllers: [BlackoutsController],
  providers: [BlackoutsService],
})
export class BlackoutsModule {}
