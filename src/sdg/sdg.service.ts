import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class SDGService {
  async create(data: { name: string }) {
    return prisma.sDG.create({ data });
  }

  async findAll() {
    return prisma.sDG.findMany({
      orderBy: { id: 'asc' }
    });
  }
} 