import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull, type Repository } from 'typeorm';
import { PaginatedResponse } from '#common/dto/pagination.dto.js';
import type { NotificationFiltersDto } from './dto/notification-filters.dto.js';
import { Notification } from './entities/notification.entity.js';
import { UserDevice } from './entities/user-device.entity.js';

/** Un aviso en la bandeja: sin los datos internos del envío push. */
export interface NotificationView {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: Date | null;
  createdAt: Date;
}

const toView = (n: Notification): NotificationView => ({
  id: n.id,
  title: n.title,
  body: n.body,
  data: n.data,
  readAt: n.readAt,
  createdAt: n.createdAt,
});

/**
 * Bandeja de avisos de cada persona (RF-19) y sus teléfonos registrados para el push
 * (RF-20). Cada persona solo ve y toca lo suyo: lo ajeno responde 404.
 */
@Injectable()
export class NotificationInboxService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get notifications(): Repository<Notification> {
    return this.dataSource.getRepository(Notification);
  }

  async list(
    userId: string,
    filters: NotificationFiltersDto,
  ): Promise<PaginatedResponse<NotificationView>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const [rows, total] = await this.notifications.findAndCount({
      where: { userId, ...(filters.unread ? { readAt: IsNull() } : {}) },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return new PaginatedResponse(rows.map(toView), total, page, limit);
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    return { count: await this.notifications.countBy({ userId, readAt: IsNull() }) };
  }

  /** Marca un aviso como leído. Repetirlo no cambia la hora de la primera lectura. */
  async markRead(userId: string, id: string): Promise<NotificationView> {
    const notification = await this.notifications.findOneBy({ id, userId });
    if (!notification) throw new NotFoundException('El aviso no existe.');
    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notifications.update(id, { readAt: notification.readAt });
    }
    return toView(notification);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notifications.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { updated: result.affected ?? 0 };
  }

  /**
   * Registra el teléfono donde la persona recibe avisos. Si el token era de otra persona
   * (el teléfono cambió de manos y entró alguien más), pasa a la nueva: los avisos de la
   * anterior ya no le llegan.
   */
  async registerDevice(userId: string, token: string, platform: string): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(UserDevice)
      .values({ userId, expoPushToken: token, platform, lastSeenAt: new Date() })
      .orUpdate(['user_id', 'platform', 'last_seen_at'], ['expo_push_token'])
      .execute();
  }

  /** Deja de enviar avisos a ese teléfono. Solo el dueño del registro puede quitarlo. */
  async removeDevice(userId: string, token: string): Promise<void> {
    await this.dataSource.getRepository(UserDevice).delete({ userId, expoPushToken: token });
  }
}
