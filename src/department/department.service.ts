import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class DepartmentService {
  async createDepartment(data: { name: string }) {
    return prisma.department.create({ data });
  }

  async findAll(includeEmployees: boolean = false) {
    return prisma.department.findMany({
      include: includeEmployees ? { users: true } : undefined,
      orderBy: { id: 'asc' }
    });
  }

  async findById(id: number, includeEmployees: boolean = false) {
    return prisma.department.findUnique({
      where: { id },
      include: includeEmployees ? { users: true } : undefined
    });
  }

  async updateDepartment(id: number, data: { name: string }) {
    return prisma.department.update({
      where: { id },
      data,
      include: { users: true }
    });
  }

  async deleteDepartment(id: number) {
    return prisma.department.delete({
      where: { id }
    });
  }
} 