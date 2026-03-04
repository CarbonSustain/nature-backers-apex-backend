import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class UserService {
  private prisma = new PrismaClient();

  async getAllUsers() {
    return this.prisma.user.findMany({
      orderBy: { id: 'asc' }
    });
  }

  async getUserById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getUserByEmail(email: string) { 
    return this.prisma.user.findFirst({ 
      where: { business_email: { equals: email.trim(), mode: 'insensitive' } }, 
    }); 
  }

  async updateUserRole(userId: number, roleId: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role_id: roleId },
      include: { role: true }
    });
  }

  async createEmployee(data: {
    first_name: string;
    last_name: string;
    business_email: string;
    departmentId: number;
    roleId: number;
  }) {
    return this.prisma.user.create({
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        business_email: data.business_email,
        departmentId: data.departmentId,
        role_id: data.roleId,
        // Set default values for Google OAuth fields
        google_sub: null,
        personal_email: null,
        email_verified: false,
        profile_picture: null,
        id_token: null,
        id_token_expiry: null,
        access_token: null,
        refresh_token: null,
      },
      include: {
        department: true,
        role: true
      }
    });
  }

  async createEmployeesBulk(employees: Array<{
    first_name: string;
    last_name: string;
    business_email: string;
    departmentId: number;
    roleId?: number;
  }>) {
    const results = [];

    for (const employee of employees) {
      try {
        const created = await this.createEmployee({
          first_name: employee.first_name,
          last_name: employee.last_name,
          business_email: employee.business_email,
          departmentId: employee.departmentId,
          roleId: employee.roleId || 3
        });
        results.push({ success: true, data: created });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          employee: { first_name: employee.first_name, last_name: employee.last_name, business_email: employee.business_email }
        });
      }
    }

    return results;
  }
} 
