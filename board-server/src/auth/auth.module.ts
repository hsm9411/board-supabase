import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../entities/user.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthClientService } from './auth-client.service'; // ✅ 추가

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: 3600,
        },
      }),
    }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [JwtStrategy, AuthClientService], // ✅ 추가
  exports: [JwtStrategy, PassportModule, AuthClientService], // ✅ 추가
})
export class AuthModule {}
