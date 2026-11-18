import { Inject, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { UserRole } from '#common/enums/domain.enums.js';
import { User } from '#modules/users/entities/user.entity.js';
import { Notification } from './entities/notification.entity.js';
import { PushDispatcher } from './push-dispatcher.service.js';

export interface NotificationContent {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Notificaciones in-app (RF-19). Se escriben dentro de la transacción de la
 * operación que las origina: si la operación falla, el aviso no queda huérfano. Nacen
 * pendientes de envío push, que hace `PushDispatcher` después de confirmarse (HU-19).
 */
@Injectable()
export class NotificationsService {
  constructor(@Inject(PushDispatcher) private readonly push: PushDispatcher) {}

  async notifyUsers(
    manager: EntityManager,
    userIds: string[],
    content: NotificationContent,
  ): Promise<void> {
    if (!userIds.length) return;
    await manager.save(
      userIds.map((userId) =>
        manager.create(Notification, {
          userId,
          title: content.title,
          body: content.body,
          data: content.data ?? null,
        }),
      ),
    );
    this.push.kick();
  }

  /** Avisa a todas las personas activas con un rol, p. ej. la coordinación. */
  async notifyRole(
    manager: EntityManager,
    role: UserRole,
    content: NotificationContent,
  ): Promise<void> {
    const users = await manager.find(User, {
      select: { id: true },
      where: { role, isActive: true },
    });
    await this.notifyUsers(
      manager,
      users.map((user) => user.id),
      content,
    );
  }
}
