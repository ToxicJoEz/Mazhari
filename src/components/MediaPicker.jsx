import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { useResource } from '../lib/store';
import ContentImage from './ContentImage';
const MAX_BYTES = 20 * 1024 * 1024;
async function preparePhoto(file) {
  if (
    !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) ||
    !file.size ||
    file.size > MAX_BYTES
  )
    throw new Error('Choose JPEG, PNG, WebP, or AVIF photos up to 20 MB each.');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 50_000_000)
      throw new Error('Image dimensions are too large.');
    const scale = Math.min(1, 3000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.88));
    if (!blob || blob.size > 10 * 1024 * 1024) throw new Error('The prepared image is too large.');
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: blob.type });
  } catch {
    throw new Error(
      'This image could not be prepared. Try another JPEG, PNG, WebP, or AVIF photo up to 20 MB and 50 megapixels.',
    );
  } finally {
    bitmap?.close();
  }
}
function sendFile(file, signed, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    for (const [key, value] of Object.entries(signed.params)) form.append(key, String(value));
    form.append('api_key', signed.apiKey);
    form.append('signature', signed.signature);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`);
    xhr.timeout = 180000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () =>
      reject(new Error('Upload interrupted. Check your connection and try again.'));
    xhr.ontimeout = () =>
      reject(new Error('Upload timed out. Try a smaller image or a faster connection.'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else
        reject(
          new Error(
            'Cloudinary rejected this file. Use a JPEG, PNG, WebP, or AVIF image up to 20 MB.',
          ),
        );
    };
    xhr.send(form);
  });
}
export default function MediaPicker({
  token,
  selected = [],
  onChange,
  max = 8,
  purpose = 'product',
  onBusy,
  manager = false,
}) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [archived, setArchived] = useState(false);
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(''),
    [error, setError] = useState(''),
    [pending, setPending] = useState(null);
  const resource = useResource(
    `/admin/media?page=${page}&limit=12&search=${encodeURIComponent(search)}&status=${archived ? 'archived' : 'ready'}`,
    token,
  );
  useEffect(() => {
    onBusy?.(busy);
    return () => onBusy?.(false);
  }, [busy, onBusy]);
  async function finish(id) {
    const response = await apiRequest(`/admin/media/${id}/complete`, {
      token,
      method: 'POST',
      body: '{}',
    });
    setPending(null);
    resource.refresh();
    return response.media.url;
  }
  async function upload(files) {
    const chosen = Array.from(files);
    if (!chosen.length || busy) return;
    const available = manager ? chosen.length : max - selected.length;
    if (chosen.length > available) {
      setError(`You can select up to ${max} photos. Remove a selection first.`);
      return;
    }
    setError('');
    setBusy(true);
    const uploaded = [];
    try {
      for (const [index, file] of chosen.entries()) {
        if (
          !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) ||
          !file.size ||
          file.size > MAX_BYTES
        )
          throw new Error('Use JPEG, PNG, WebP, or AVIF images up to 20 MB each.');
        setProgress(`Preparing photo ${index + 1} of ${chosen.length}...`);
        const prepared = await preparePhoto(file);
        const signed = await apiRequest('/admin/media/sign', {
          token,
          method: 'POST',
          body: JSON.stringify({
            name: file.name.slice(0, 150),
            size: prepared.size,
            type: prepared.type,
            purpose,
          }),
        });
        await sendFile(prepared, signed, (percent) =>
          setProgress(`Uploading ${index + 1} of ${chosen.length}: ${percent}%`),
        );
        setPending(signed.mediaId);
        setProgress('Verifying image...');
        uploaded.push(await finish(signed.mediaId));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      if (uploaded.length && !manager) onChange([...selected, ...uploaded].slice(0, max));
      setBusy(false);
      setProgress('');
      resource.refresh();
    }
  }
  function move(index, target) {
    const next = [...selected];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  }
  async function archive(media) {
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/admin/media/${media._id}/archive`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({ restore: archived }),
      });
      resource.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="media-picker stack">
      {!manager && (
        <>
          <p className="muted small">
            {max === 1
              ? 'Choose one image, or remove it to show a placeholder.'
              : `Choose up to ${max} photos. The first photo is the cover; use the arrows to reorder the gallery.`}
          </p>
          <div className="selected-images">
            {selected.map((url, index) => (
              <div key={url}>
                <ContentImage src={url} alt={`Selected photo ${index + 1}`} width={300} />
                <span>
                  {index === 0
                    ? max === 1
                      ? 'Selected image'
                      : 'Cover photo'
                    : `Photo ${index + 1}`}
                </span>
                <div className="row">
                  {index > 0 && (
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Move photo ${index + 1} earlier`}
                      className="text-link"
                      onClick={() => move(index, index - 1)}
                    >
                      ←
                    </button>
                  )}
                  {index < selected.length - 1 && (
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Move photo ${index + 1} later`}
                      className="text-link"
                      onClick={() => move(index, index + 1)}
                    >
                      →
                    </button>
                  )}
                </div>
                {index > 0 && (
                  <button
                    type="button"
                    className="text-link"
                    disabled={busy}
                    onClick={() => move(index, 0)}
                  >
                    Make cover
                  </button>
                )}
                <button
                  type="button"
                  className="text-link"
                  disabled={busy}
                  aria-label={`Remove photo ${index + 1}`}
                  onClick={() => onChange(selected.filter((item) => item !== url))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="row">
        <label className="btn media-upload">
          Upload {purpose === 'banner' ? 'banner' : 'photos'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple={manager || max > 1}
            disabled={busy || (!manager && selected.length >= max)}
            onChange={(event) => {
              upload(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
        <span className="muted small">
          JPEG, PNG, WebP, AVIF · source photos up to 20 MB · optimized automatically
        </span>
      </div>
      {resource.data?.configured === false && (
        <p className="notice warning">
          Cloudinary credentials are not configured on this server yet.
        </p>
      )}
      {progress && <p role="status">{progress}</p>}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {pending && (
        <button
          type="button"
          className="btn secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              const url = await finish(pending);
              if (!manager) onChange([...selected, url].slice(0, max));
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Retry upload verification
        </button>
      )}
      <div className="media-tools row">
        <label>
          Find an uploaded image
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        {manager && (
          <label className="check">
            <input
              type="checkbox"
              checked={archived}
              onChange={(event) => {
                setArchived(event.target.checked);
                setPage(1);
              }}
            />
            Show archived images
          </label>
        )}
      </div>
      {resource.loading && <p role="status">Loading media...</p>}
      {resource.error && (
        <div>
          <p role="alert" className="error">
            {resource.error}
          </p>
          <button type="button" onClick={resource.refresh} className="text-link">
            Try again
          </button>
        </div>
      )}
      <div className="asset-grid">
        {resource.data?.media.map((media) => {
          const checked = selected.includes(media.url);
          return (
            <div className="media-tile" key={media._id}>
              <button
                type="button"
                className={'asset-choice' + (checked ? ' selected' : '')}
                aria-pressed={manager ? undefined : checked}
                disabled={busy || (!manager && !checked && selected.length >= max)}
                onClick={() => {
                  if (!manager)
                    onChange(
                      checked
                        ? selected.filter((url) => url !== media.url)
                        : [...selected, media.url],
                    );
                }}
              >
                <ContentImage src={media.url} alt={media.name} width={300} loading="lazy" />
                <span>
                  {media.name}
                  {checked ? ' ✓' : ''}
                </span>
                <span className="muted">
                  {media.width} × {media.height}
                </span>
              </button>
              {manager && (
                <button
                  className="text-link"
                  type="button"
                  disabled={busy}
                  onClick={() => archive(media)}
                >
                  {archived ? 'Restore' : 'Archive'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {resource.data && !resource.data.media.length && (
        <p className="muted">
          {search
            ? 'No images match your search.'
            : archived
              ? 'No archived images.'
              : 'No uploaded images yet. Upload your first photo above.'}
        </p>
      )}
      {resource.data?.pages > 1 && (
        <div className="row">
          <button
            type="button"
            className="btn secondary"
            disabled={page <= 1 || busy}
            onClick={() => setPage(page - 1)}
          >
            Previous images
          </button>
          <span>
            Page {page} of {resource.data.pages}
          </span>
          <button
            type="button"
            className="btn secondary"
            disabled={page >= resource.data.pages || busy}
            onClick={() => setPage(page + 1)}
          >
            Next images
          </button>
        </div>
      )}
      {!manager && (
        <p className="muted small">
          {selected.length} / {max} selected. Selections are applied when you save.
        </p>
      )}
    </div>
  );
}
