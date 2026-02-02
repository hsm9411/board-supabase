import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller'; // 컨트롤러 임포트

@Module({
  imports: [TerminusModule],
  controllers: [HealthController], // 여기에 컨트롤러가 등록되어 있어야 합니다!
})
export class HealthModule {}