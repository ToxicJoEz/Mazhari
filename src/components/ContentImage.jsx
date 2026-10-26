import { useState } from 'react';
function cloudImage(src, width = 1200) {
  if (!/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(src || '')) return '';
  return src.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${width}/`);
}
export default function ContentImage({
  src,
  alt = '',
  width = 1200,
  placeholder = 'Photo coming soon',
  className = '',
  ...props
}) {
  const [failed, setFailed] = useState('');
  const url = cloudImage(src, width);
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
    <img {...props} className={className} src={url} alt={alt} onError={() => setFailed(url)} />
  );
}
