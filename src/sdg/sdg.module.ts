import { Module } from '@nestjs/common';
import { SDGController } from './sdg.controller';
import { SDGService } from './sdg.service';

@Module({
  controllers: [SDGController],
  providers: [SDGService],
  exports: [SDGService],
})
export class SDGModule {} 