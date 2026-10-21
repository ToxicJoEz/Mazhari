import bannerImg from '../assets/banner.jpeg';

import fringesJacket1 from '../assets/Fringes jacket1.JPEG';
import fringesJacket2 from '../assets/Fringes jacket2.JPEG';
import fringesJacket3 from '../assets/Fringes jacket3.PNG';

import furJacket1 from '../assets/Fur jacket1.PNG';
import furJacket2 from '../assets/Fur jacket2.JPEG';
import furJacket3 from '../assets/Fur jacket3.JPEG';

import scarfJacket1 from '../assets/Scarf jacket1.PNG';
import scarfJacket2 from '../assets/Scarf jacket2.JPEG';
import scarfJacket3 from '../assets/Scarf jacket3.JPEG';

import semiFormal1 from '../assets/Simi formal jacket1.PNG';
import semiFormal2 from '../assets/Simi formal jacket2.PNG';
import semiFormal3 from '../assets/Simi formal jacket3.PNG';
import semiFormal4 from '../assets/Simi formal jacket4.PNG';

import suedeJacket1 from '../assets/Suede jacket1.JPEG';
import suedeJacket2 from '../assets/Suede jacket2.PNG';
import suedeJacket3 from '../assets/Suede jacket3.JPEG';

export { bannerImg };

export const mockProducts = [
  {
    id: 'fringes-jacket',
    name: 'Fringed Artisanal Leather Jacket',
    price: 320,
    shippingFee: 15,
    colors: ['Noir Black', 'Desert Taupe', 'Rose Dust'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'A striking statement silhouette defined by cascading hand-cut fringe accents along the back and sleeves. Tailored from supple, full-grain leather with dark gunmetal hardware and a relaxed modern crop.',
    images: [fringesJacket1, fringesJacket2, fringesJacket3],
    material: '100% Genuine Soft Lambskin & Hand-Cut Fringe',
    care: 'Specialist leather clean only. Avoid prolonged moisture exposure.',
    stock: 4,
    category: 'Outerwear',
  },
  {
    id: 'fur-jacket',
    name: 'Plush Cocoon Fur Jacket',
    price: 380,
    shippingFee: 20,
    colors: ['Soft Ecru', 'Midnight Onyx', 'Blush Tint'],
    sizes: ['S', 'M', 'L'],
    description:
      'Architectural warmth meets high-fashion opulence. Designed in an enveloping cocoon cut from ultra-dense plush fur, complete with an oversized storm collar and concealed horn-button fasteners.',
    images: [furJacket1, furJacket2, furJacket3],
    material: 'Ultra-Dense Heavyweight Faux Fur with Tonal Silk Lining',
    care: 'Professional dry clean only. Store in breathable garment bag.',
    stock: 2,
    category: 'Outerwear',
  },
  {
    id: 'scarf-jacket',
    name: 'Integrated Scarf Draped Jacket',
    price: 260,
    shippingFee: 15,
    colors: ['Charcoal Heather', 'Oatmeal Melange', 'Deep Plum'],
    sizes: ['S', 'M', 'L', 'XL'],
    description:
      'Effortless luxury in motion. Features a seamlessly attached fringe scarf that can be draped over the shoulder or wrapped high around the neckline. Hand-finished double-faced wool ensures light yet insulated comfort.',
    images: [scarfJacket1, scarfJacket2, scarfJacket3],
    material: 'Double-Faced Wool Blend (85% Virgin Wool, 15% Cashmere)',
    care: 'Dry clean only. Cool iron under pressing cloth.',
    stock: 5,
    category: 'Outerwear',
  },
  {
    id: 'semi-formal-jacket',
    name: 'Structured Semi-Formal Blazer Jacket',
    price: 295,
    shippingFee: 15,
    colors: ['Obsidian Black', 'Smoky Mauve', 'Chalk Pinstripe'],
    sizes: ['38', '40', '42', '44'],
    description:
      'Bridging the divide between formal tailoring and rebellious contemporary outerwear. Features sculpted power shoulders, an asymmetric lapel, and a tapered waist with precision internal piping.',
    images: [semiFormal1, semiFormal2, semiFormal3, semiFormal4],
    material: 'Structured Italian Wool Suiting with Silk Jacquard Interior',
    care: 'Dry clean only.',
    stock: 3,
    category: 'Outerwear',
  },
  {
    id: 'suede-jacket',
    name: 'Heavyweight Suede Trucker Jacket',
    price: 340,
    shippingFee: 18,
    colors: ['Tobacco Brown', 'Smoked Olive', 'Pitch Black'],
    sizes: ['S', 'M', 'L', 'XL'],
    description:
      'Constructed from rich, tactile heavyweight suede that develops a unique vintage patina over time. Finished with custom matte snap buttons, dual chest envelope pockets, and adjustable waist tabs.',
    images: [suedeJacket1, suedeJacket2, suedeJacket3],
    material: '100% Heavyweight Suede Calfskin with Quilted Insulation',
    care: 'Specialist suede and leather clean only.',
    stock: 6,
    category: 'Outerwear',
  },
];
