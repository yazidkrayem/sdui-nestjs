import { SduiInMemoryCacheAdapter } from './in-memory-cache.adapter';

describe('SduiInMemoryCacheAdapter', () => {
  let cache: SduiInMemoryCacheAdapter;

  beforeEach(() => {
    cache = new SduiInMemoryCacheAdapter();
  });

  it('returns null for a missing key', async () => {
    expect(await cache.get('missing')).toBeNull();
  });

  it('round-trips a set value', async () => {
    await cache.set('foo', 'bar');
    expect(await cache.get('foo')).toBe('bar');
  });

  it('deletes one or more keys', async () => {
    await cache.set('a', '1');
    await cache.set('b', '2');
    await cache.del('a', 'b');
    expect(await cache.get('a')).toBeNull();
    expect(await cache.get('b')).toBeNull();
  });

  it('increments a missing key from 0', async () => {
    expect(await cache.incr('counter')).toBe(1);
    expect(await cache.incr('counter')).toBe(2);
  });

  it('preserves TTL across incr', async () => {
    jest.useFakeTimers().setSystemTime(0);
    await cache.set('counter', '1', 100);
    await cache.incr('counter');
    jest.setSystemTime(99_000);
    expect(await cache.get('counter')).toBe('2');
    jest.setSystemTime(101_000);
    expect(await cache.get('counter')).toBeNull();
    jest.useRealTimers();
  });

  it('expires a key after its TTL elapses', async () => {
    jest.useFakeTimers().setSystemTime(0);
    await cache.set('temp', 'value', 10);
    jest.setSystemTime(9_000);
    expect(await cache.get('temp')).toBe('value');
    jest.setSystemTime(10_001);
    expect(await cache.get('temp')).toBeNull();
    jest.useRealTimers();
  });

  it('never expires a key set without a TTL', async () => {
    jest.useFakeTimers().setSystemTime(0);
    await cache.set('forever', 'value');
    jest.setSystemTime(1_000_000_000);
    expect(await cache.get('forever')).toBe('value');
    jest.useRealTimers();
  });

  it('matches keys against a glob pattern', async () => {
    await cache.set('sdui:app1:manifest', '1');
    await cache.set('sdui:app2:manifest', '1');
    await cache.set('other:key', '1');
    const matches = await cache.keys('sdui:*:manifest');
    expect(matches.sort()).toEqual(['sdui:app1:manifest', 'sdui:app2:manifest']);
  });

  it('excludes expired keys from keys() and clears them lazily', async () => {
    jest.useFakeTimers().setSystemTime(0);
    await cache.set('gone', 'value', 1);
    jest.setSystemTime(2_000);
    expect(await cache.keys('*')).toEqual([]);
    jest.useRealTimers();
  });

  it('reports healthy', async () => {
    expect(await cache.isHealthy()).toBe(true);
  });
});
