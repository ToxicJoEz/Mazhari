export const BANNER_IMAGE = '/images/library/banner.webp';
export const PRODUCT_IMAGES = [
  {
    label: 'Fringes — photo 1',
    group: 'Fringes',
    source: 'Fringes jacket1.JPEG',
    url: '/images/library/fringes-1.webp',
  },
  {
    label: 'Fringes — photo 2',
    group: 'Fringes',
    source: 'Fringes jacket2.JPEG',
    url: '/images/library/fringes-2.webp',
  },
  {
    label: 'Fringes — photo 3',
    group: 'Fringes',
    source: 'Fringes jacket3.PNG',
    url: '/images/library/fringes-3.webp',
  },
  {
    label: 'Fur — photo 1',
    group: 'Fur',
    source: 'Fur jacket1.PNG',
    url: '/images/library/fur-1.webp',
  },
  {
    label: 'Fur — photo 2',
    group: 'Fur',
    source: 'Fur jacket2.JPEG',
    url: '/images/library/fur-2.webp',
  },
  {
    label: 'Fur — photo 3',
    group: 'Fur',
    source: 'Fur jacket3.JPEG',
    url: '/images/library/fur-3.webp',
  },
  {
    label: 'Scarf — photo 1',
    group: 'Scarf',
    source: 'Scarf jacket1.PNG',
    url: '/images/library/scarf-1.webp',
  },
  {
    label: 'Scarf — photo 2',
    group: 'Scarf',
    source: 'Scarf jacket2.JPEG',
    url: '/images/library/scarf-2.webp',
  },
  {
    label: 'Scarf — photo 3',
    group: 'Scarf',
    source: 'Scarf jacket3.JPEG',
    url: '/images/library/scarf-3.webp',
  },
  {
    label: 'Semi Formal — photo 1',
    group: 'Semi Formal',
    source: 'Simi formal jacket1.PNG',
    url: '/images/library/semi-formal-1.webp',
  },
  {
    label: 'Semi Formal — photo 2',
    group: 'Semi Formal',
    source: 'Simi formal jacket2.PNG',
    url: '/images/library/semi-formal-2.webp',
  },
  {
    label: 'Semi Formal — photo 3',
    group: 'Semi Formal',
    source: 'Simi formal jacket3.PNG',
    url: '/images/library/semi-formal-3.webp',
  },
  {
    label: 'Semi Formal — photo 4',
    group: 'Semi Formal',
    source: 'Simi formal jacket4.PNG',
    url: '/images/library/semi-formal-4.webp',
  },
  {
    label: 'Suede — photo 1',
    group: 'Suede',
    source: 'Suede jacket1.JPEG',
    url: '/images/library/suede-1.webp',
  },
  {
    label: 'Suede — photo 2',
    group: 'Suede',
    source: 'Suede jacket2.PNG',
    url: '/images/library/suede-2.webp',
  },
  {
    label: 'Suede — photo 3',
    group: 'Suede',
    source: 'Suede jacket3.JPEG',
    url: '/images/library/suede-3.webp',
  },
];
export const productGallery = (category) =>
  PRODUCT_IMAGES.filter((image) => image.group === category).map((image) => image.url);
