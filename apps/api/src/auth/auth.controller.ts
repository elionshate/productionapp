import { Controller, Post, Get, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('has-users')
  async hasUsers() {
    const result = await this.authService.hasUsers();
    return { success: true, data: result };
  }

  @Post('register')
  async register(@Body() body: RegisterDto) {
    try {
      const user = await this.authService.register(body.username, body.password);
      return { success: true, data: user };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new HttpException(
        { success: false, error: message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    try {
      const user = await this.authService.login(body.username, body.password);
      return { success: true, data: user };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new HttpException(
        { success: false, error: message },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
