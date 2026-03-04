import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch'; // npm install node-fetch@2

@Injectable()
export class AuthService {
  private client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  private prisma = new PrismaClient();

  async verifyGoogleToken(idToken: string, accessToken: string, refreshToken: string) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const {
        sub: googleSub,
        email,
        name: fullName,
        picture: profilePicture,
        email_verified: emailVerified,
        exp,
      } = payload;

      // Split full name into first and last name
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Check if user exists by name (case-insensitive, trimmed)
      const existingUser = await this.prisma.user.findFirst({
        where: {
          AND: [
            {
              first_name: {
                equals: firstName.trim().toLowerCase(),
                mode: 'insensitive'
              }
            },
            {
              last_name: {
                equals: lastName.trim().toLowerCase(),
                mode: 'insensitive'
              }
            }
          ]
        }
      });

      if (!existingUser) {
        throw new UnauthorizedException('User is not an employee and cannot vote');
      }

      // Update existing user with Google OAuth data
      const user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          google_sub: googleSub,
          personal_email: email,
          email_verified: emailVerified,
          profile_picture: profilePicture,
          id_token: idToken,
          access_token: accessToken,
          refresh_token: refreshToken,
          id_token_expiry: new Date(exp * 1000),
          updated_at: new Date(),
        },
      });

      return user;
    } catch (err) {
      throw new Error('Invalid Google token: ' + err.message);
    }
  }

  async refreshAccessToken(googleSub: string) {
    const user = await this.prisma.user.findUnique({ where: { google_sub: googleSub } });
  
    if (!user || !user.refresh_token) {
      throw new UnauthorizedException('User or refresh token not found');
    }
  
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: user.refresh_token,
      grant_type: 'refresh_token',
    });
  
    const response = await fetch(process.env.GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
  
    if (!response.ok) {
      const errorData = await response.json();

      if (errorData.error === 'invalid_grant') {
        // Refresh token expired or revoked — clear it in DB
        await this.prisma.user.update({
          where: { google_sub: googleSub },
          data: { refresh_token: null },
        });

        throw new UnauthorizedException('Refresh token expired or revoked. Please sign in again.');
      }

      throw new Error(`Failed to refresh token: ${errorData.error_description || 'Unknown error'}`);
    }
  
    const tokenData = await response.json();
  
    await this.prisma.user.update({
      where: { google_sub: googleSub },
      data: {
        access_token: tokenData.access_token,
        id_token_expiry: new Date(Date.now() + tokenData.expires_in * 1000),
        updated_at: new Date(),
      },
    });
  
    return {
      access_token: tokenData.access_token,
      refresh_token: user.refresh_token,  // Return stored refresh token
      expires_in: tokenData.expires_in,
    };
  }  
}
