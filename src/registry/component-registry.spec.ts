import {
  COMPONENT_REGISTRY,
  createNode,
  getComponentMeta,
  getContainerTypes,
  getLeafTypes,
  getPalette,
  isChildAllowed,
} from './component-registry';
import { PROP_SCHEMAS, type ComponentType } from '../schema/descriptor.schema';

describe('COMPONENT_REGISTRY', () => {
  const allTypes = Object.keys(COMPONENT_REGISTRY) as ComponentType[];

  it('has every registry entry keyed under its own type', () => {
    for (const type of allTypes) {
      expect(COMPONENT_REGISTRY[type].type).toBe(type);
    }
  });

  it('has defaultProps that satisfy the corresponding zod prop schema', () => {
    for (const type of allTypes) {
      const schema = PROP_SCHEMAS[type];
      const result = schema.safeParse(COMPONENT_REGISTRY[type].defaultProps);
      expect({ type, result }).toEqual({
        type,
        result: expect.objectContaining({ success: true }),
      });
    }
  });

  it('partitions every type into exactly leaf or container', () => {
    const containers = new Set(getContainerTypes());
    const leaves = new Set(getLeafTypes());
    expect(containers.size + leaves.size).toBe(allTypes.length);
    for (const type of allTypes) {
      expect(containers.has(type) !== leaves.has(type)).toBe(true);
    }
  });

  it('getComponentMeta returns the registry entry', () => {
    expect(getComponentMeta('TEXT_BLOCK')).toBe(COMPONENT_REGISTRY.TEXT_BLOCK);
  });

  it('isChildAllowed is false for leaf parents', () => {
    for (const type of getLeafTypes()) {
      expect(isChildAllowed(type, 'TEXT_BLOCK')).toBe(false);
    }
  });

  it('isChildAllowed is true under an "all"-children container', () => {
    expect(COMPONENT_REGISTRY.CONTAINER.allowedChildren).toBe('all');
    expect(isChildAllowed('CONTAINER', 'BUTTON')).toBe(true);
  });

  it('createNode builds a fresh node with the type default props and no children', () => {
    const node = createNode('SPACER', 'my-id');
    expect(node).toEqual({
      id: 'my-id',
      type: 'SPACER',
      props: COMPONENT_REGISTRY.SPACER.defaultProps,
      children: [],
    });
  });

  it('createNode generates an id when none is supplied', () => {
    const node = createNode('SPACER');
    expect(typeof node.id).toBe('string');
    expect(node.id.length).toBeGreaterThan(0);
  });

  it('getPalette returns one entry per registry type', () => {
    expect(getPalette()).toHaveLength(allTypes.length);
  });
});
