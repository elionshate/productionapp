import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma-db/prisma.service';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Password hashing utilities using Node.js built-in scrypt.
 * Format: salt:hash (both hex-encoded).
 * scrypt is memory-hard and resistant to GPU/ASIC attacks.
 */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  // Backward-compatible: detect legacy base64 passwords (no ':' separator)
  if (!stored.includes(':')) {
    // Legacy base64 format — verify and return true for migration
    return Buffer.from(password).toString('base64') === stored;
  }
  const [salt, hash] = stored.split(':');
  const hashBuffer = Buffer.from(hash, 'hex');
  const candidateBuffer = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, candidateBuffer);
}

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
    const hashedPassword = hashPassword(password);
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
    if (!verifyPassword(password, user.password)) {
      throw new Error('Invalid username or password');
    }
    // Auto-migrate legacy base64 passwords to scrypt on successful login
    if (!user.password.includes(':')) {
      const upgraded = hashPassword(password);
      await this.prisma.user.update({ where: { id: user.id }, data: { password: upgraded } });
    }
    return { id: user.id, username: user.username, createdAt: user.createdAt };
  }
}
