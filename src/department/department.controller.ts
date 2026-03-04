import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Res,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { DepartmentService } from './department.service';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Controller('department')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  async create(@Body() data: { name: string }, @Res() res: Response) {
    try {
      if (!data.name || data.name.trim() === '') {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'Department name is required',
        });
      }

      const department = await this.departmentService.createDepartment({
        name: data.name.trim()
      });

      return res.status(HttpStatus.CREATED).json({
        statusCode: 201,
        message: 'Department created successfully',
        data: department,
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return res.status(HttpStatus.CONFLICT).json({
          statusCode: 409,
          message: 'Department with this name already exists',
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  @Get()
  async findAll(@Query('withEmployees') withEmployees: string, @Res() res: Response) {
    try {
      const includeEmployees = withEmployees === 'true';
      const departments = await this.departmentService.findAll(includeEmployees);
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Departments fetched successfully',
        data: departments,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Query('withEmployees') withEmployees: string, @Res() res: Response) {
    try {
      const departmentId = parseInt(id, 10);
      if (isNaN(departmentId) || departmentId <= 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'Invalid department ID. Must be a positive number.',
        });
      }

      const includeEmployees = withEmployees === 'true';
      const department = await this.departmentService.findById(departmentId, includeEmployees);
      if (!department) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: 404,
          message: 'Department not found',
        });
      }
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Department fetched successfully',
        data: department,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: { name: string }, @Res() res: Response) {
    try {
      if (!data.name || data.name.trim() === '') {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'Department name is required',
        });
      }

      const department = await this.departmentService.updateDepartment(+id, {
        name: data.name.trim()
      });

      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Department updated successfully',
        data: department,
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: 404,
          message: 'Department not found',
        });
      }
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return res.status(HttpStatus.CONFLICT).json({
          statusCode: 409,
          message: 'Department with this name already exists',
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Res() res: Response) {
    try {
      const departmentId = parseInt(id, 10);
      if (isNaN(departmentId) || departmentId <= 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'Invalid department ID. Must be a positive number.',
        });
      }

      const department = await this.departmentService.deleteDepartment(departmentId);
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Department deleted successfully',
        data: department,
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: 404,
          message: 'Department not found',
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
} 