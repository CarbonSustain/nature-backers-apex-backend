import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class RoleService {
  async createRole(data: { name: string }) {
    return prisma.role.create({ data });
  }

  async findAll() {
    return prisma.role.findMany({
      orderBy: { id: 'asc' }
    });
  }

  async findById(id: number) {
    return prisma.role.findUnique({
      where: { id },
    });
  }

  async updateRole(id: number, data: { name: string }) {
    return prisma.role.update({
      where: { id },
      data,
    });
  }

  async deleteRole(id: number) {
    return prisma.role.delete({
      where: { id }
    });
  }
} 