import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SduiAppsService } from './sdui-apps.service';
import { App } from '../entities/app.entity';
import { SduiNavConfig } from '../entities/sdui-nav-config.entity';
import { SduiScreen } from '../entities/sdui-screen.entity';
import { SduiAuditPort } from '../interfaces/sdui-audit.port';

function mockRepo<T extends object>(): jest.Mocked<Repository<T>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((v: unknown) => v),
    count: jest.fn().mockResolvedValue(0),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<Repository<T>>;
}

function buildService() {
  const appRepo = mockRepo<App>();
  const navRepo = mockRepo<SduiNavConfig>();
  const screenRepo = mockRepo<SduiScreen>();
  const auditLog: jest.Mocked<SduiAuditPort> = { record: jest.fn() };
  const service = new SduiAppsService(appRepo, navRepo, screenRepo, auditLog);
  return { service, appRepo, navRepo, screenRepo, auditLog };
}

const baseApp = (overrides: Partial<App> = {}): App =>
  ({
    id: 'uuid-1',
    appId: 'my-app',
    name: 'My App',
    description: null,
    iconUrl: null,
    primaryColor: null,
    status: 'active',
    createdBy: 'admin-1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    ...overrides,
  }) as App;

describe('SduiAppsService', () => {
  describe('findOne', () => {
    it('throws NotFoundException when the app does not exist', async () => {
      const { service, appRepo } = buildService();
      (appRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns the app with attached screen-count stats', async () => {
      const { service, appRepo, screenRepo } = buildService();
      (appRepo.findOne as jest.Mock).mockResolvedValue(baseApp());
      (screenRepo.count as jest.Mock)
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(2) // published
        .mockResolvedValueOnce(1) // draft
        .mockResolvedValueOnce(2); // archived

      const result = await service.findOne('my-app');
      expect(result.appId).toBe('my-app');
      expect(result.screenCounts).toEqual({
        total: 5,
        published: 2,
        draft: 1,
        archived: 2,
      });
    });
  });

  describe('create', () => {
    it('rejects a duplicate appId', async () => {
      const { service, appRepo } = buildService();
      (appRepo.findOne as jest.Mock).mockResolvedValue(baseApp());
      await expect(
        service.create({ appId: 'my-app', name: 'My App' } as never, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('creates the app, a default nav config, and an audit entry', async () => {
      const { service, appRepo, navRepo, auditLog } = buildService();
      (appRepo.findOne as jest.Mock).mockResolvedValue(null);
      (appRepo.save as jest.Mock).mockImplementation((v) =>
        Promise.resolve({ ...v, id: 'new-uuid' }),
      );

      await service.create(
        { appId: 'new-app', name: 'New App' } as never,
        'admin-1',
      );

      expect(navRepo.save).toHaveBeenCalledTimes(1);
      expect(auditLog.record).toHaveBeenCalledWith(
        'admin-1',
        'create_sdui_app',
        expect.anything(),
        'sdui_app',
        expect.objectContaining({ appId: 'new-app' }),
      );
    });
  });

  describe('softDelete', () => {
    it('refuses to delete an app that still has published screens', async () => {
      const { service, appRepo, screenRepo } = buildService();
      (appRepo.findOne as jest.Mock).mockResolvedValue(baseApp());
      (screenRepo.count as jest.Mock).mockResolvedValue(3);

      await expect(service.softDelete('my-app', 'admin-1')).rejects.toThrow(
        ConflictException,
      );
      expect(appRepo.softDelete).not.toHaveBeenCalled();
    });

    it('soft-deletes and audits when there are no published screens', async () => {
      const { service, appRepo, screenRepo, auditLog } = buildService();
      (appRepo.findOne as jest.Mock).mockResolvedValue(baseApp());
      (screenRepo.count as jest.Mock).mockResolvedValue(0);

      await service.softDelete('my-app', 'admin-1');

      expect(appRepo.softDelete).toHaveBeenCalledWith({ appId: 'my-app' });
      expect(auditLog.record).toHaveBeenCalledWith(
        'admin-1',
        'delete_sdui_app',
        expect.anything(),
        'sdui_app',
        { appId: 'my-app' },
      );
    });
  });

  describe('updateStatus', () => {
    it('records a suspend-specific audit action when suspending', async () => {
      const { service, appRepo, auditLog } = buildService();
      (appRepo.findOne as jest.Mock).mockResolvedValue(baseApp());
      (appRepo.save as jest.Mock).mockImplementation((v) => Promise.resolve(v));

      await service.updateStatus(
        'my-app',
        { status: 'suspended' } as never,
        'admin-1',
      );

      expect(auditLog.record).toHaveBeenCalledWith(
        'admin-1',
        'suspend_sdui_app',
        expect.anything(),
        'sdui_app',
        expect.objectContaining({ status: 'suspended' }),
      );
    });
  });
});
