import { PickType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto.js';

/** Cuerpo de `PATCH /users/:id/password`: la misma regla de contraseña que el alta. */
export class ResetPasswordDto extends PickType(CreateUserDto, ['password'] as const) {}
