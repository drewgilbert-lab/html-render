import React from 'react';

export function Figure({ src, alt, caption, placeholder }) {
  return (
    <figure className="figure-block">
      {src
        ? <img src={src} alt={alt || ''} />
        : <div className="figure-placeholder"><span className="figure-placeholder-label">{placeholder || '[IMAGE NEEDED]'}</span></div>}
      {caption ? <figcaption className="figure-caption">{caption}</figcaption> : null}
    </figure>
  );
}
