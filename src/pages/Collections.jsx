import React from 'react';
import { Link } from 'react-router-dom';
import { bannerImg } from '../data/mockProducts';
import suedeJacket1 from '../assets/Suede jacket1.JPEG';
import furJacket1 from '../assets/Fur jacket1.PNG';
import PageTransition from '../components/PageTransition';
import { motion } from 'framer-motion';

const collectionsData = [
  {
    id: 'c1',
    title: 'The Signature Outerwear Drop',
    description: 'A focused study in proportion and raw material integrity. Suede, lambskin leather, and artisanal fringe construction.',
    image: bannerImg,
    link: '/shop'
  },
  {
    id: 'c2',
    title: 'Tactile Heavyweights',
    description: 'Heavyweight calfskin suede and double-faced virgin wool coats designed for architectural presence and effortless drape.',
    image: suedeJacket1,
    link: '/shop'
  },
  {
    id: 'c3',
    title: 'Plush Cocoon Series',
    description: 'Dense faux fur and statement storm collars engineered to envelop the body in sculptural warmth.',
    image: furJacket1,
    link: '/shop'
  }
];

const Collections = () => {
  return (
    <PageTransition className="collections-page">
      <div className="collections-header">
        <h1>Collections</h1>
        <p>Curated capsules and seasonal releases.</p>
      </div>

      <div className="collections-list flex flex-col">
        {collectionsData.map((collection, index) => (
          <motion.div 
            key={collection.id} 
            className="collection-block relative w-full flex items-center justify-center"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="collection-bg absolute inset-0 z-0">
              <div className="overlay absolute inset-0"></div>
              <img src={collection.image} alt={collection.title} className="w-full h-full object-cover" />
            </div>
            
            <div className="collection-content relative z-10 flex flex-col items-center">
              <h2>{collection.title}</h2>
              <p>{collection.description}</p>
              <Link to={collection.link} className="explore-btn">
                Explore Collection
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </PageTransition>
  );
};

export default Collections;
