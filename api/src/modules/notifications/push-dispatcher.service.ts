import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { Notification } from './entities/notification.entity.js';
import { UserDevice } from './entities/user-device.entity.js';
import { EXPO_BATCH_SIZE, sendToExpo, type PushMessage, type TicketOutcome } from './expo-push.js';

/** Un aviso con más de esta antigüedad ya no se envía: llegaría tarde y confundiría. */
export const PUSH_MAX_AGE_MINUTES = 60;
/** Intentos antes de dar el envío por fallido; el aviso sigue en la bandeja. */
export const PUSH_MAX_ATTEMPTS = 3;
/** Avisos por vuelta. */
const BATCH = 50;

/**
 * Envía por push los avisos pendientes (RF-20, HU-19). La tabla `notification` hace de
 * cola: cada aviso nace `PENDING` en la transacción que lo origina, y aquí se envía
 * después. Corre cada `PUSH_INTERVAL_MS` y, además, poco después de cada aviso nuevo
 * (`kick`), para que llegue en segundos.
 *
 * Varias réplicas de la API no se pisan: `FOR UPDATE SKIP LOCKED`.
 */
@Injectable()
export class PushDispatcher implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(PushDispatcher.name);
  private timer: NodeJS.Timeout | null = null;
  private kickTimer: NodeJS.Timeout | null = null;
  private running: Promise<void> | null = null;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  private get enabled(): boolean {
    return this.config.get<boolean>('PUSH_ENABLED', true);
  }

  onModuleInit(): void {
    if (!this.enabled) return;
    const interval = this.config.get<number>('PUSH_INTERVAL_MS', 15_000);
    this.timer = setInterval(() => void this.dispatch(), interval);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.kickTimer) clearTimeout(this.kickTimer);
  }

  /**
   * Pide una vuelta pronto. Se llama al crear avisos, que todavía están dentro de su
   * transacción: el segundo de espera deja que se confirme. Si no alcanza, el aviso
   * sale en la vuelta periódica.
   */
  kick(): void {
    if (!this.enabled || this.kickTimer) return;
    this.kickTimer = setTimeout(() => {
      this.kickTimer = null;
      void this.dispatch();
    }, 1_000);
    this.kickTimer.unref();
  }

  /** Una vuelta. Si ya hay una en curso, espera a esa en lugar de empezar otra. */
  dispatch(fetchImpl?: typeof fetch): Promise<void> {
    this.running ??= this.run(fetchImpl)
      .catch((error: unknown) => {
        this.logger.error(`Falló el envío push: ${String(error)}`);
      })
      .finally(() => {
        this.running = null;
      });
    return this.running;
  }

  private async run(fetchImpl?: typeof fetch): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Los viejos ya no se envían.
      await manager
        .createQueryBuilder()
        .update(Notification)
        .set({ pushStatus: 'SKIPPED' })
        .where("push_status = 'PENDING'")
        .andWhere(`created_at < now() - make_interval(mins => :age)`, {
          age: PUSH_MAX_AGE_MINUTES,
        })
        .execute();

      const pending = await manager
        .createQueryBuilder(Notification, 'n')
        .innerJoin('n.user', 'u')
        .where("n.push_status = 'PENDING'")
        .andWhere('u.is_active = true')
        .orderBy('n.created_at', 'ASC')
        .limit(BATCH)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getMany();
      if (!pending.length) return;

      const devices = await manager.find(UserDevice, {
        where: { userId: In([...new Set(pending.map((n) => n.userId))]) },
      });
      const byUser = new Map<string, UserDevice[]>();
      for (const device of devices) {
        byUser.set(device.userId, [...(byUser.get(device.userId) ?? []), device]);
      }

      const messages: { notification: Notification; device: UserDevice; message: PushMessage }[] =
        [];
      const withoutDevice: string[] = [];
      for (const notification of pending) {
        const targets = byUser.get(notification.userId) ?? [];
        if (!targets.length) withoutDevice.push(notification.id);
        for (const device of targets) {
          messages.push({
            notification,
            device,
            message: {
              to: device.expoPushToken,
              title: notification.title,
              body: notification.body,
              // La app abre el detalle y marca el aviso como leído al tocarlo.
              data: { ...(notification.data ?? {}), notificationId: notification.id },
              sound: 'default',
              channelId: 'avisos',
              priority: 'high',
            },
          });
        }
      }

      if (withoutDevice.length) {
        await manager.update(Notification, { id: In(withoutDevice) }, { pushStatus: 'SKIPPED' });
      }

      const outcomes: TicketOutcome[] = [];
      for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
        const batch = messages.slice(i, i + EXPO_BATCH_SIZE).map((m) => m.message);
        outcomes.push(
          ...(await sendToExpo(batch, this.config.get<string>('EXPO_ACCESS_TOKEN'), fetchImpl)),
        );
      }

      // Un aviso cuenta como enviado si llegó a alguno de los teléfonos de la persona.
      const delivered = new Set<string>();
      const gone = new Set<string>();
      messages.forEach(({ notification, device }, index) => {
        if (outcomes[index] === 'ok') delivered.add(notification.id);
        if (outcomes[index] === 'device-gone') gone.add(device.id);
      });
      if (gone.size) await manager.delete(UserDevice, { id: In([...gone]) });

      for (const notification of pending) {
        if (withoutDevice.includes(notification.id)) continue;
        if (delivered.has(notification.id)) {
          await manager.update(Notification, notification.id, {
            pushStatus: 'SENT',
            pushAttempts: notification.pushAttempts + 1,
          });
          continue;
        }
        const attempts = notification.pushAttempts + 1;
        const allGone = (byUser.get(notification.userId) ?? []).every((d) => gone.has(d.id));
        await manager.update(Notification, notification.id, {
          pushAttempts: attempts,
          pushStatus: allGone ? 'SKIPPED' : attempts >= PUSH_MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
        });
      }
    });
  }
}
