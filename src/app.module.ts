// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BoardModule } from './board/board.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        // autoLoadEntities: true를 켜면 entities 배열은 필요 없습니다.
        // 각 모듈(AuthModule, BoardModule)에서 forFeature로 등록된 엔티티를 자동으로 읽습니다.
        autoLoadEntities: true, 
        synchronize: false, // 프로덕션 관리를 위해 false로 변경
        ssl: {
          rejectUnauthorized: false,
        },
      }),
    }),
    AuthModule,
    BoardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}