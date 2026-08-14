import { DescriptorSchema } from './descriptor.schema';

describe('DescriptorSchema', () => {
  it('accepts a minimal valid descriptor', () => {
    const result = DescriptorSchema.safeParse({
      version: 1,
      root: {
        id: 'root',
        type: 'CONTAINER',
        props: { direction: 'vertical', scrollable: true, padding: 16 },
        children: [
          {
            id: 'title',
            type: 'TEXT_BLOCK',
            props: { variant: 'h1' },
            children: [],
          },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it('defaults version to 1 when omitted', () => {
    const result = DescriptorSchema.safeParse({
      root: {
        id: 'root',
        type: 'CONTAINER',
        props: {},
        children: [],
      },
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.version).toBe(1);
  });

  it('rejects an invalid hex color', () => {
    const result = DescriptorSchema.safeParse({
      version: 1,
      root: {
        id: 'root',
        type: 'CONTAINER',
        props: { backgroundColor: 'not-a-color' },
        children: [],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown prop due to .strict() schemas', () => {
    const result = DescriptorSchema.safeParse({
      version: 1,
      root: {
        id: 'root',
        type: 'CONTAINER',
        props: { direction: 'vertical', totallyMadeUpProp: true },
        children: [],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown node type', () => {
    const result = DescriptorSchema.safeParse({
      version: 1,
      root: {
        id: 'root',
        type: 'NOT_A_REAL_TYPE',
        props: {},
        children: [],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a leaf node that is given non-empty children', () => {
    const result = DescriptorSchema.safeParse({
      version: 1,
      root: {
        id: 'root',
        type: 'TEXT_BLOCK',
        props: {},
        children: [
          { id: 'nope', type: 'TEXT_BLOCK', props: {}, children: [] },
        ],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a descriptor missing the required root field', () => {
    const result = DescriptorSchema.safeParse({ version: 1 });
    expect(result.success).toBe(false);
  });

  it('validates nested children recursively', () => {
    const result = DescriptorSchema.safeParse({
      version: 1,
      root: {
        id: 'root',
        type: 'COLUMN',
        props: {},
        children: [
          {
            id: 'row',
            type: 'ROW',
            props: {},
            children: [
              {
                id: 'bad-icon',
                type: 'ICON',
                props: { name: 'star', color: 'not-a-color' },
                children: [],
              },
            ],
          },
        ],
      },
    });
    expect(result.success).toBe(false);
  });
});
