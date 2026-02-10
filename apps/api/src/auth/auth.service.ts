import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma-db/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async hasUsers(): Promise<boolean> {
    const count = await this.prisma.user.count();
    return count > 0;
  }

  async register(username: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new Error('Username already exists');
    }
    const hashedPassword = Buffer.from(password).toString('base64');
    const user = await this.prisma.user.create({
      data: { username, password: hashedPassword },
    });
    return { id: user.id, username: user.username, createdAt: user.createdAt };
  }

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new Error('Invalid username or password');
    }
    const hashedPassword = Buffer.from(password).toString('base64');
    if (user.password !== hashedPassword) {
      throw new Error('Invalid username or password');
    }
    return { id: user.id, username: user.username, createdAt: user.createdAt };
  }
}
