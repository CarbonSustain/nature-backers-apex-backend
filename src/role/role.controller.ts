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
} from '@nestjs/common';
import { RoleService } from './role.service';
import { Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  async create(@Body() data: { name: string }, @Res() res: Response) {
    try {
      if (!data.name || data.name.trim() === '') {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'Role name is required',
        });
      }

      const role = await this.roleService.createRole({
        name: data.name.trim()
      });

      return res.status(HttpStatus.CREATED).json({
        statusCode: 201,
        message: 'Role created successfully',
        data: role,
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return res.status(HttpStatus.CONFLICT).json({
          statusCode: 409,
          message: 'Role with this name already exists',
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
  async findAll(@Res() res: Response) {
    try {
      const roles = await this.roleService.findAll();
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Roles fetched successfully',
        data: roles,
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
  async findById(@Param('id') id: string, @Res() res: Response) {
    try {
      const role = await this.roleService.findById(+id);
      if (!role) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: 404,
          message: 'Role not found',
        });
      }
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Role fetched successfully',
        data: role,
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
          message: 'Role name is required',
        });
      }

      const role = await this.roleService.updateRole(+id, {
        name: data.name.trim()
      });

      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Role updated successfully',
        data: role,
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: 404,
          message: 'Role not found',
        });
      }
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return res.status(HttpStatus.CONFLICT).json({
          statusCode: 409,
          message: 'Role with this name already exists',
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
      const role = await this.roleService.deleteRole(+id);
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Role deleted successfully',
        data: role,
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: 404,
          message: 'Role not found',
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