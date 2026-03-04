import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  async googleLogin(
    @Body('token') idToken: string,
    @Body('access_token') accessToken: string,
    @Body('refresh_token') refreshToken: string,
  ) {
    try {
      const user = await this.authService.verifyGoogleToken(
        idToken,
        accessToken,
        refreshToken,
      );
      return { user };
    } catch (err) {
      return { error: err.message };
    }
  }

  @Post('refresh')
  async refreshToken(@Body('google_sub') googleSub: string) {
    return this.authService.refreshAccessToken(googleSub);
  }
} 