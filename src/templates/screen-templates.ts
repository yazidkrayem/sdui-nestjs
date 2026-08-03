import type { Descriptor } from '../schema/descriptor.schema';

export interface ScreenTemplate {
  id: string;
  name: string;
  description: string;
  category: 'auction' | 'product' | 'promo' | 'feed' | 'blank';
  thumbnail: string;
  descriptor: Descriptor;
}

const PLACEHOLDER_IMAGE = 'https://assets.portee.app/placeholder.jpg';

export const SCREEN_TEMPLATES: ScreenTemplate[] = [
  {
    id: 'auction_live',
    name: 'Live Auction',
    description:
      'Header + countdown timer + auction card + bid button. Perfect for active auction detail screens.',
    category: 'auction',
    thumbnail: 'Gavel',
    descriptor: {
      version: 1,
      root: {
        id: 'root',
        type: 'CONTAINER',
        props: { direction: 'vertical', scrollable: true, padding: 16 },
        children: [
          {
            id: 'hdr',
            type: 'HEADER',
            props: {
              title: 'Live Auction',
              showBackButton: true,
              showNotificationBell: false,
            },
            children: [],
          },
          {
            id: 'timer',
            type: 'DYNAMIC_TEXT',
            props: {
              source: 'item.endsAt',
              format: 'countdown',
              style: 'large',
            },
            children: [],
          },
          {
            id: 'card',
            type: 'CARD',
            props: { dataSource: 'auctions/live', limit: 1 },
            children: [],
          },
          {
            id: 'spc1',
            type: 'SPACER',
            props: { size: 'md' },
            children: [],
          },
          {
            id: 'bid_btn',
            type: 'BUTTON',
            props: {
              label: { en: 'Place Bid', ar: 'تقديم عرض' },
              variant: 'primary',
              size: 'lg',
              fullWidth: true,
              backgroundColor: '#f59e0b',
              action: {
                type: 'dispatchEvent',
                payload: { event: 'auction.bid' },
              },
            },
            children: [],
          },
        ],
      },
    },
  },

  {
    id: 'auction_list',
    name: 'Auction List',
    description:
      'Header + tabbed view splitting live and upcoming auctions into two lists.',
    category: 'auction',
    thumbnail: 'List',
    descriptor: {
      version: 1,
      root: {
        id: 'root',
        type: 'CONTAINER',
        props: { direction: 'vertical', scrollable: false, padding: 0 },
        children: [
          {
            id: 'hdr',
            type: 'HEADER',
            props: {
              title: 'Auctions',
              showBackButton: false,
              showNotificationBell: true,
            },
            children: [],
          },
          {
            id: 'tabs',
            type: 'TABS',
            props: {
              defaultIndex: 0,
              tabs: [
                {
                  label: 'Live',
                  children: [
                    {
                      id: 'live_feed',
                      type: 'LIST_FEED',
                      props: {
                        dataSource: 'auctions',
                        limit: 20,
                        emptyStateText: 'No live auctions',
                      },
                      children: [],
                    },
                  ],
                },
                {
                  label: 'Upcoming',
                  children: [
                    {
                      id: 'upcoming_feed',
                      type: 'LIST_FEED',
                      props: {
                        dataSource: 'auctions',
                        limit: 20,
                        emptyStateText: 'No upcoming auctions',
                      },
                      children: [],
                    },
                  ],
                },
              ],
            },
            children: [],
          },
        ],
      },
    },
  },

  {
    id: 'product_grid',
    name: 'Product Grid',
    description:
      'Header + 2-column product grid sourced from featured products.',
    category: 'product',
    thumbnail: 'LayoutGrid',
    descriptor: {
      version: 1,
      root: {
        id: 'root',
        type: 'CONTAINER',
        props: { direction: 'vertical', scrollable: true, padding: 12 },
        children: [
          {
            id: 'hdr',
            type: 'HEADER',
            props: {
              title: 'Products',
              showBackButton: false,
              showNotificationBell: false,
            },
            children: [],
          },
          {
            id: 'spc1',
            type: 'SPACER',
            props: { size: 'sm' },
            children: [],
          },
          {
            id: 'grid',
            type: 'PRODUCT_GRID',
            props: {
              columns: 2,
              dataSource: 'featured',
            },
            children: [],
          },
        ],
      },
    },
  },

  {
    id: 'promo_page',
    name: 'Promo Page',
    description:
      'Full-bleed banner + headline text + subtext + CTA button. Ideal for campaigns.',
    category: 'promo',
    thumbnail: 'Image',
    descriptor: {
      version: 1,
      root: {
        id: 'root',
        type: 'CONTAINER',
        props: { direction: 'vertical', scrollable: true, padding: 0 },
        children: [
          {
            id: 'banner',
            type: 'BANNER',
            props: {
              imageUrl: PLACEHOLDER_IMAGE,
              aspectRatio: '16:9',
            },
            children: [],
          },
          {
            id: 'inner',
            type: 'CONTAINER',
            props: { direction: 'vertical', scrollable: false, padding: 20 },
            children: [
              {
                id: 'title',
                type: 'TEXT_BLOCK',
                props: {
                  text: 'Special Offer',
                  variant: 'h1',
                  align: 'center',
                },
                children: [],
              },
              {
                id: 'spc1',
                type: 'SPACER',
                props: { size: 'sm' },
                children: [],
              },
              {
                id: 'body',
                type: 'TEXT_BLOCK',
                props: {
                  text: 'Discover exclusive deals curated just for you.',
                  variant: 'body',
                  align: 'center',
                },
                children: [],
              },
              {
                id: 'spc2',
                type: 'SPACER',
                props: { size: 'lg' },
                children: [],
              },
              {
                id: 'cta',
                type: 'BUTTON',
                props: {
                  label: 'Shop Now',
                  variant: 'primary',
                  action: { type: 'navigate', payload: { screen: 'products' } },
                  fullWidth: true,
                },
                children: [],
              },
            ],
          },
        ],
      },
    },
  },

  {
    id: 'home_feed',
    name: 'Home Feed',
    description:
      'Banner carousel + live auctions section + featured products grid. Typical app home screen.',
    category: 'feed',
    thumbnail: 'House',
    descriptor: {
      version: 1,
      root: {
        id: 'root',
        type: 'CONTAINER',
        props: { direction: 'vertical', scrollable: true, padding: 0 },
        children: [
          {
            id: 'hdr',
            type: 'HEADER',
            props: {
              title: 'Home',
              showBackButton: false,
              showNotificationBell: true,
            },
            children: [],
          },
          {
            id: 'hero_banner',
            type: 'BANNER',
            props: {
              imageUrl: PLACEHOLDER_IMAGE,
              aspectRatio: '16:9',
              linkAction: { type: 'navigate', payload: { screen: 'auctions' } },
            },
            children: [],
          },
          {
            id: 'spc1',
            type: 'SPACER',
            props: { size: 'md' },
            children: [],
          },
          {
            id: 'live_label',
            type: 'TEXT_BLOCK',
            props: { text: 'Live Auctions', variant: 'h2', align: 'left' },
            children: [],
            styles: { padding: { top: 0, right: 16, bottom: 0, left: 16 } },
          },
          {
            id: 'live_card',
            type: 'CARD',
            props: { dataSource: 'live', limit: 3 },
            children: [],
          },
          {
            id: 'div1',
            type: 'DIVIDER',
            props: {},
            children: [],
            styles: { margin: { top: 12, right: 16, bottom: 12, left: 16 } },
          },
          {
            id: 'prod_label',
            type: 'TEXT_BLOCK',
            props: { text: 'Featured Products', variant: 'h2', align: 'left' },
            children: [],
            styles: { padding: { top: 0, right: 16, bottom: 8, left: 16 } },
          },
          {
            id: 'prod_grid',
            type: 'PRODUCT_GRID',
            props: { columns: 2, dataSource: 'featured' },
            children: [],
          },
        ],
      },
    },
  },

  {
    id: 'blank',
    name: 'Blank Screen',
    description: 'A single empty container — start from scratch.',
    category: 'blank',
    thumbnail: 'Square',
    descriptor: {
      version: 1,
      root: {
        id: 'root',
        type: 'CONTAINER',
        props: { direction: 'vertical', scrollable: true, padding: 16 },
        children: [],
      },
    },
  },
];

export function getTemplate(id: string): ScreenTemplate | undefined {
  return SCREEN_TEMPLATES.find((t) => t.id === id);
}
