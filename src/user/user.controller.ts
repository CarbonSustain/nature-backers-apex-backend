import { Controller, Get, Param, Put, Body, Post, Res, HttpStatus } from '@nestjs/common';
import { UserService } from './user.service';
import { Response } from 'express';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get()
  async getAllUsers(@Res() res: Response) {
    try {
      const users = await this.userService.getAllUsers();
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Users fetched successfully',
        data: users,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  @Get('email/:email')
  async getUserByEmail(@Param('email') emailParam: string, @Res() res: Response) {
    try {
      // decode & basic validation
      const email = decodeURIComponent(emailParam).trim();
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!isEmail) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'Invalid email format.',
        });
      }

      const user = await this.userService.getUserByEmail(email);
      if (!user) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: 404,
          message: 'User not found',
        });
      }

      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'User fetched successfully',
        data: user,
      });
    } catch (error: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  @Get(':id')
  async getUserById(@Param('id') id: string, @Res() res: Response) {
    try {
      const userId = parseInt(id, 10);
      if (isNaN(userId) || userId <= 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'Invalid user ID. Must be a positive number.',
        });
      }

      const user = await this.userService.getUserById(userId);
      if (!user) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: 404,
          message: 'User not found',
        });
      }

      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'User fetched successfully',
        data: user,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  @Put(':id/role')
  async updateUserRole(
    @Param('id') userId: string,
    @Body('roleId') roleId: number,
    @Res() res: Response
  ) {
    try {
      const userNum = parseInt(userId, 10);
      if (isNaN(userNum) || userNum <= 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'Invalid user ID. Must be a positive number.',
        });
      }

      if (!roleId || isNaN(roleId) || roleId <= 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'Valid roleId is required. Must be a positive number.',
        });
      }

      const updatedUser = await this.userService.updateUserRole(userNum, roleId);
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'User role updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  @Post('employee')
  async createEmployee(
    @Body() body: {
      first_name: string;
      last_name: string;
      business_email: string;
      departmentId: number;
      roleId?: number; // Optional, defaults to Employee role
    },
    @Res() res: Response
  ) {
    try {
      // Validation
      if (!body.first_name || !body.last_name || !body.business_email || !body.departmentId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'first_name, last_name, business_email, and departmentId are required'
        });
      }

      const employee = await this.userService.createEmployee({
        first_name: body.first_name,
        last_name: body.last_name,
        business_email: body.business_email,
        departmentId: body.departmentId,
        roleId: body.roleId || 3 // Default to Employee role (id: 3)
      });

      return res.status(HttpStatus.CREATED).json({
        statusCode: 201,
        message: 'Employee created successfully',
        data: employee
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Failed to create employee',
        error: error.message
      });
    }
  }

  @Post('employees/bulk')
  async createEmployeesBulk(
    @Body() body: {
      employees: Array<{
        first_name: string;
        last_name: string;
        business_email: string;
        departmentId: number;
        roleId?: number;
      }>;
    },
    @Res() res: Response
  ) {
    try {
      // Validation
      if (!body.employees || !Array.isArray(body.employees) || body.employees.length === 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'employees array is required and must not be empty'
        });
      }

      const results = await this.userService.createEmployeesBulk(body.employees);

      return res.status(HttpStatus.CREATED).json({
        statusCode: 201,
        message: `${results.length} employees created successfully`,
        data: results
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Failed to create employees',
        error: error.message
      });
    }
  }
} 