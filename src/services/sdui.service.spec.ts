import { SduiService } from './sdui.service';

// These three methods don't touch any injected dependency (repositories,
// cache, audit log, strings/nav services, gateway) — safe to unit-test by
// instantiating the service with stub constructor args.
function buildService(): SduiService {
  const stub = undefined as never;
  return new SduiService(stub, stub, stub, stub, stub, stub, stub, stub);
}

describe('SduiService (pure methods)', () => {
  describe('computeEtag', () => {
    it('is deterministic for the same content', () => {
      const service = buildService();
      expect(service.computeEtag('hello')).toBe(service.computeEtag('hello'));
    });

    it('differs for different content', () => {
      const service = buildService();
      expect(service.computeEtag('hello')).not.toBe(service.computeEtag('world'));
    });

    it('returns a 32-char hex md5 digest', () => {
      const service = buildService();
      expect(service.computeEtag('hello')).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  describe('validateDescriptor', () => {
    it('reports valid: true for a schema-conformant descriptor', () => {
      const service = buildService();
      const result = service.validateDescriptor({
        version: 1,
        root: { id: 'root', type: 'CONTAINER', props: {}, children: [] },
      });
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it('reports valid: false with path/message errors for a bad descriptor', () => {
      const service = buildService();
      const result = service.validateDescriptor({ version: 1 });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toEqual(
        expect.objectContaining({ path: expect.any(String), message: expect.any(String) }),
      );
    });
  });

  describe('validateDescriptorLimits', () => {
    const validDescriptor = {
      root: { id: 'root', type: 'CONTAINER', props: {}, children: [] },
    };

    it('passes a small descriptor', () => {
      const service = buildService();
      expect(service.validateDescriptorLimits(validDescriptor)).toEqual({
        valid: true,
        errors: [],
      });
    });

    it('flags a descriptor over the 512 KB size limit', () => {
      const service = buildService();
      const bigDescriptor = {
        root: {
          id: 'root',
          type: 'CONTAINER',
          props: { note: 'x'.repeat(600_000) },
          children: [],
        },
      };
      const result = service.validateDescriptorLimits(bigDescriptor);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('exceeds max'))).toBe(true);
    });

    it('flags duplicate node IDs', () => {
      const service = buildService();
      const descriptor = {
        root: {
          id: 'root',
          type: 'CONTAINER',
          props: {},
          children: [
            { id: 'dup', type: 'TEXT_BLOCK', props: {}, children: [] },
            { id: 'dup', type: 'TEXT_BLOCK', props: {}, children: [] },
          ],
        },
      };
      const result = service.validateDescriptorLimits(descriptor);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Duplicate node ID'))).toBe(true);
    });

    it('flags nesting deeper than 10 levels', () => {
      const service = buildService();
      let node: { id: string; type: string; props: object; children: unknown[] } = {
        id: 'leaf',
        type: 'TEXT_BLOCK',
        props: {},
        children: [],
      };
      for (let i = 0; i < 12; i++) {
        node = { id: `n${i}`, type: 'CONTAINER', props: {}, children: [node] };
      }
      const result = service.validateDescriptorLimits({ root: node });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('nesting depth'))).toBe(true);
    });
  });
});
