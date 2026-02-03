import { Injectable, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface UserDto {
  id: string;
  email: string;
  nickname: string;
  createdAt: Date;
}

@Injectable()
export class AuthClientService {
  private readonly authServiceUrl: string;

  constructor(private configService: ConfigService) {
    this.authServiceUrl =
      this.configService.get<string>('AUTH_SERVICE_URL') || 'http://auth-service:3001';
  }

  async getUserById(userId: string, token: string): Promise<UserDto> {
    try {
      const response = await axios.get(`${this.authServiceUrl}/auth/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new HttpException('User not found', 404);
      }
      throw new HttpException('Auth service unavailable', 503);
    }
  }

  async getUserByEmail(email: string, token: string): Promise<UserDto> {
    try {
      const response = await axios.get(`${this.authServiceUrl}/auth/users/email/${email}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      return response.data;
    } catch {
      throw new HttpException('Auth service unavailable', 503);
    }
  }
}
