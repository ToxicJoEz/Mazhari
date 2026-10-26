import { useState } from 'react';
function cloudImage(src, width = 1200, quality = 'auto') {
  if (!/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(src || '')) return '';
  return src.replace('/image/upload/', `/image/upload/f_auto,q_${quality},c_limit,w_${width}/`);
}
export default function ContentImage({
  src,
  alt = '',
  width = 1200,
  quality = 'auto',
  responsive = false,
  sizes,
  placeholder = 'Photo coming soon',
  className = '',
  ...props
}) {
  const [failed, setFailed] = useState('');
  const url = cloudImage(src, width, quality);
  const srcSet =
    responsive && url
      ? [800, 1200, 1920, 2560, 3840, 5120, 6000]
          .map((size) => `${cloudImage(src, size, quality)} ${size}w`)
          .join(', ')
      : undefined;
  if (!url || failed === url)
    return (
      <div
        className={'image-placeholder ' + className}
        role="img"
        aria-label={alt ? `${alt}: ${placeholder}` : placeholder}
      >
        <span>{placeholder}</span>
      </div>
    );
  return (
    <img
      {...props}
      className={className}
      srcSet={srcSet}
      sizes={srcSet ? sizes || '100vw' : undefined}
      src={url}
      alt={alt}
      onError={() => setFailed(url)}
    />
  );
}
