import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppStrings } from '../entities/app-strings.entity';
import { SduiAuditPort } from '../interfaces/sdui-audit.port';
import { SduiCachePort } from '../interfaces/sdui-cache.port';
import { SDUI_AUDIT_PROVIDER, SDUI_CACHE_PROVIDER } from '../constants/tokens';
import { KEY_REGEX } from '../dto/strings.dto';

const MAX_KEYS_PER_LOCALE = 1000;
const STRINGS_TTL = 300; // 5 min

const stringsKey = (appId: string, locale: string) =>
  `${appId}:strings:${locale}`;

@Injectable()
export class SduiStringsService {
  constructor(
    @InjectRepository(AppStrings)
    private readonly repo: Repository<AppStrings>,
    @Inject(SDUI_CACHE_PROVIDER) private readonly cache: SduiCachePort,
    @Inject(SDUI_AUDIT_PROVIDER) private readonly auditLog: SduiAuditPort,
  ) {}

  async getStrings(
    appId: string,
    locale: string,
  ): Promise<Record<string, string>> {
    try {
      const cached = await this.cache.get(stringsKey(appId, locale));
      if (cached) return JSON.parse(cached) as Record<string, string>;
    } catch {
      // cache failure — fall through to DB
    }

    const row = await this.repo.findOne({ where: { appId, locale } });
    const strings = row?.strings ?? {};

    try {
      await this.cache.set(
        stringsKey(appId, locale),
        JSON.stringify(strings),
        STRINGS_TTL,
      );
    } catch {
      // non-fatal
    }
    return strings;
  }

  async getAllStrings(
    appId: string,
  ): Promise<{ en: Record<string, string>; ar: Record<string, string> }> {
    const [en, ar] = await Promise.all([
      this.getStrings(appId, 'en'),
      this.getStrings(appId, 'ar'),
    ]);
    return { en, ar };
  }

  async setKey(
    appId: string,
    locale: string,
    key: string,
    value: string,
    adminId: string,
  ): Promise<void> {
    this.validateKey(key);
    const row = await this.findOrCreate(appId, locale);
    row.strings = { ...row.strings, [key]: value };
    row.updatedBy = adminId;
    await this.repo.save(row);
    await this.invalidate(appId, locale);
  }

  async setKeys(
    appId: string,
    locale: string,
    keys: Record<string, string>,
    adminId: string,
  ): Promise<void> {
    for (const k of Object.keys(keys)) {
      this.validateKey(k);
    }
    const row = await this.findOrCreate(appId, locale);
    const merged = { ...row.strings, ...keys };
    if (Object.keys(merged).length > MAX_KEYS_PER_LOCALE) {
      throw new BadRequestException(
        `Max ${MAX_KEYS_PER_LOCALE} keys per locale per app`,
      );
    }
    row.strings = merged;
    row.updatedBy = adminId;
    await this.repo.save(row);
    await this.invalidate(appId, locale);
    this.auditLog.record(
      adminId,
      'bulk_update_sdui_strings',
      undefined,
      'sdui_strings',
      {
        appId,
        locale,
        count: Object.keys(keys).length,
      },
    );
  }

  async deleteKey(appId: string, key: string, adminId: string): Promise<void> {
    const [en, ar] = await Promise.all([
      this.repo.findOne({ where: { appId, locale: 'en' } }),
      this.repo.findOne({ where: { appId, locale: 'ar' } }),
    ]);
    if (!en && !ar)
      throw new NotFoundException('No strings found for this app');

    const updates: Promise<void>[] = [];
    if (en && key in en.strings) {
      en.strings = Object.fromEntries(
        Object.entries(en.strings).filter(([k]) => k !== key),
      );
      en.updatedBy = adminId;
      updates.push(this.repo.save(en).then(() => undefined));
    }
    if (ar && key in ar.strings) {
      ar.strings = Object.fromEntries(
        Object.entries(ar.strings).filter(([k]) => k !== key),
      );
      ar.updatedBy = adminId;
      updates.push(this.repo.save(ar).then(() => undefined));
    }
    await Promise.all(updates);
    await Promise.all([
      this.invalidate(appId, 'en'),
      this.invalidate(appId, 'ar'),
    ]);
  }

  async renameKey(
    appId: string,
    oldKey: string,
    newKey: string,
    adminId: string,
  ): Promise<void> {
    this.validateKey(newKey);
    const [en, ar] = await Promise.all([
      this.repo.findOne({ where: { appId, locale: 'en' } }),
      this.repo.findOne({ where: { appId, locale: 'ar' } }),
    ]);

    const updates: Promise<void>[] = [];

    if (en) {
      const oldVal = en.strings[oldKey];
      if (oldVal !== undefined) {
        if (newKey in en.strings)
          throw new ConflictException(`Key '${newKey}' already exists in 'en'`);
        en.strings = Object.fromEntries([
          ...Object.entries(en.strings).filter(([k]) => k !== oldKey),
          [newKey, oldVal],
        ]);
        en.updatedBy = adminId;
        updates.push(this.repo.save(en).then(() => undefined));
      }
    }
    if (ar) {
      const oldVal = ar.strings[oldKey];
      if (oldVal !== undefined) {
        if (newKey in ar.strings)
          throw new ConflictException(`Key '${newKey}' already exists in 'ar'`);
        ar.strings = Object.fromEntries([
          ...Object.entries(ar.strings).filter(([k]) => k !== oldKey),
          [newKey, oldVal],
        ]);
        ar.updatedBy = adminId;
        updates.push(this.repo.save(ar).then(() => undefined));
      }
    }

    if (updates.length === 0)
      throw new NotFoundException(`Key '${oldKey}' not found in any locale`);

    await Promise.all(updates);
    await Promise.all([
      this.invalidate(appId, 'en'),
      this.invalidate(appId, 'ar'),
    ]);
  }

  async importStrings(
    appId: string,
    data: Record<string, { en: string; ar: string }>,
    overwrite: boolean,
    adminId: string,
  ): Promise<{ imported: number; skipped: number }> {
    const [enRow, arRow] = await Promise.all([
      this.findOrCreate(appId, 'en'),
      this.findOrCreate(appId, 'ar'),
    ]);

    let imported = 0;
    let skipped = 0;

    for (const [key, { en, ar }] of Object.entries(data)) {
      this.validateKey(key);
      const enExists = key in enRow.strings;
      const arExists = key in arRow.strings;

      if ((!enExists || overwrite) && en !== undefined) {
        enRow.strings[key] = en;
        imported++;
      } else if (enExists) {
        skipped++;
      }

      if ((!arExists || overwrite) && ar !== undefined) {
        arRow.strings[key] = ar;
      }
    }

    if (
      Object.keys(enRow.strings).length > MAX_KEYS_PER_LOCALE ||
      Object.keys(arRow.strings).length > MAX_KEYS_PER_LOCALE
    ) {
      throw new BadRequestException(
        `Import would exceed max ${MAX_KEYS_PER_LOCALE} keys per locale`,
      );
    }

    enRow.updatedBy = adminId;
    arRow.updatedBy = adminId;
    await Promise.all([this.repo.save(enRow), this.repo.save(arRow)]);
    await Promise.all([
      this.invalidate(appId, 'en'),
      this.invalidate(appId, 'ar'),
    ]);

    this.auditLog.record(
      adminId,
      'import_sdui_strings',
      undefined,
      'sdui_strings',
      {
        appId,
        imported,
        skipped,
      },
    );

    return { imported, skipped };
  }

  async exportStrings(
    appId: string,
  ): Promise<Record<string, { en: string; ar: string }>> {
    const { en, ar } = await this.getAllStrings(appId);
    const allKeys = new Set([...Object.keys(en), ...Object.keys(ar)]);
    const result: Record<string, { en: string; ar: string }> = {};
    for (const key of allKeys) {
      result[key] = { en: en[key] ?? '', ar: ar[key] ?? '' };
    }
    return result;
  }

  /**
   * Walks a descriptor tree and upserts any LocalizedString prop values
   * into AppStrings. Keys are auto-generated as `{slug}.{nodeId}.{propName}`.
   * Existing keys are never overwritten.
   */
  async syncDescriptorStrings(
    appId: string,
    slug: string,
    descriptor: Record<string, unknown>,
    adminId: string,
  ): Promise<void> {
    const extracted = new Map<string, { en: string; ar: string }>();
    this.extractLocalizedStrings(descriptor, slug, extracted);

    if (extracted.size === 0) return;

    const [enRow, arRow] = await Promise.all([
      this.findOrCreate(appId, 'en'),
      this.findOrCreate(appId, 'ar'),
    ]);

    let changed = false;
    for (const [key, { en, ar }] of extracted) {
      if (!(key in enRow.strings)) {
        enRow.strings[key] = en;
        changed = true;
      }
      if (!(key in arRow.strings)) {
        arRow.strings[key] = ar;
        changed = true;
      }
    }

    if (changed) {
      enRow.updatedBy = adminId;
      arRow.updatedBy = adminId;
      await Promise.all([this.repo.save(enRow), this.repo.save(arRow)]);
      await Promise.all([
        this.invalidate(appId, 'en'),
        this.invalidate(appId, 'ar'),
      ]);
    }
  }

  private extractLocalizedStrings(
    value: unknown,
    prefix: string,
    result: Map<string, { en: string; ar: string }>,
    nodeId?: string,
  ): void {
    if (!value || typeof value !== 'object') return;

    // Check if this is a DescriptorNode with id + props
    const node = value as Record<string, unknown>;

    if (
      typeof node['id'] === 'string' &&
      typeof node['type'] === 'string' &&
      node['props']
    ) {
      const currentNodeId = node['id'];
      const props = node['props'] as Record<string, unknown>;

      for (const [propName, propValue] of Object.entries(props)) {
        if (this.isLocalizedString(propValue)) {
          const ls = propValue as { en: string; ar: string };
          const key = `${prefix}.${currentNodeId}.${propName}`;
          if (!result.has(key)) {
            result.set(key, { en: ls.en, ar: ls.ar });
          }
        }
      }

      // Recurse into children
      if (Array.isArray(node['children'])) {
        for (const child of node['children'] as unknown[]) {
          this.extractLocalizedStrings(child, prefix, result, currentNodeId);
        }
      }
    } else if (node['root']) {
      // Top-level descriptor object
      this.extractLocalizedStrings(node['root'], prefix, result, nodeId);
    }
  }

  private isLocalizedString(v: unknown): boolean {
    return (
      typeof v === 'object' &&
      v !== null &&
      'en' in v &&
      'ar' in v &&
      typeof (v as Record<string, unknown>)['en'] === 'string' &&
      typeof (v as Record<string, unknown>)['ar'] === 'string'
    );
  }

  private async findOrCreate(
    appId: string,
    locale: string,
  ): Promise<AppStrings> {
    let row = await this.repo.findOne({ where: { appId, locale } });
    if (!row) {
      row = this.repo.create({ appId, locale, strings: {}, updatedBy: null });
      row = await this.repo.save(row);
    }
    return row;
  }

  private async invalidate(appId: string, locale: string): Promise<void> {
    try {
      await this.cache.del(stringsKey(appId, locale));
    } catch {
      // non-fatal
    }
  }

  private validateKey(key: string): void {
    if (!KEY_REGEX.test(key)) {
      throw new BadRequestException(
        `Invalid key '${key}': must match lowercase letters, digits, underscores, dot-separated`,
      );
    }
    if (key.length > 128) {
      throw new BadRequestException(`Key too long: max 128 chars`);
    }
  }
}
