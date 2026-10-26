import { useState, useCallback } from 'react';
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
  const [failed, setFailed] = useState(''),
    [loaded, setLoaded] = useState('');
  const url = cloudImage(src, width, quality);
  const imageRef = useCallback(
    (node) => {
      if (node?.complete && node.naturalWidth > 0) setLoaded(url);
    },
    [url],
  );
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
    <div className={'image-frame ' + className} aria-busy={loaded !== url}>
      <img
        {...props}
        ref={imageRef}
        srcSet={srcSet}
        sizes={srcSet ? sizes || '100vw' : undefined}
        src={url}
        alt={alt}
        onLoad={() => setLoaded(url)}
        onError={() => setFailed(url)}
      />
      {loaded !== url && (
        <div className="image-loading" role="status" aria-label="Loading image">
          <span className="spinner" />
          <span className="sr-only">Loading image...</span>
        </div>
      )}
    </div>
  );
}
