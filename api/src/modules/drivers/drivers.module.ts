import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '#modules/users/entities/user.entity.js';
import { DriversController } from './drivers.controller.js';
import { DriversService } from './drivers.service.js';
import { Driver } from './entities/driver.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Driver, User])],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}
