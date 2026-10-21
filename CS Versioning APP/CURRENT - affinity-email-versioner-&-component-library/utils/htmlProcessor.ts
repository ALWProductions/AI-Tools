import { EmailLink, EmailImage } from '../types';

/**
 * Applies link modifications, image replacements, dimension attributes/styles
 * (width, height, max-width, max-height), and anchor wrapping/unwrapping to the email HTML.
 */
export function applyEmailConfigurations(
  html: string,
  links: EmailLink[],
  images: EmailImage[]
): string {
  if (!html || !html.trim()) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 1. Process Standard Text & Button Links
  links.forEach((link) => {
    const anchors = Array.from(doc.querySelectorAll('a'));
    anchors.forEach((a) => {
      const href = a.getAttribute('href');
      // Match by original URL
      if (href === link.originalUrl) {
        if (link.isDeleted) {
          a.setAttribute('href', '#');
        } else if (link.isReplaced && link.currentUrl) {
          a.setAttribute('href', link.currentUrl);
        }
      }
    });
  });

  // 2. Process Image Blocks (src, alt, width, height, max-width, max-height, <a href>)
  images.forEach((imgConfig) => {
    const allImgs = Array.from(doc.querySelectorAll('img'));
    allImgs.forEach((imgElem) => {
      const currentSrc = imgElem.getAttribute('src');

      // Match by originalSrc or newSrc
      if (
        currentSrc === imgConfig.originalSrc ||
        (imgConfig.newSrc && currentSrc === imgConfig.newSrc)
      ) {
        // --- 2a. Update Image Source ---
        if (!imgConfig.keepOriginal && imgConfig.newSrc) {
          imgElem.setAttribute('src', imgConfig.newSrc);
        } else if (imgConfig.keepOriginal) {
          imgElem.setAttribute('src', imgConfig.originalSrc);
        }

        // --- 2b. Update Alt Text ---
        if (imgConfig.newAlt !== undefined) {
          imgElem.setAttribute('alt', imgConfig.newAlt);
        }

        // --- 2c. Update HTML width & height attributes ---
        if (imgConfig.width) {
          const cleanW = imgConfig.width.replace('px', '').trim();
          imgElem.setAttribute('width', cleanW);
        }

        if (imgConfig.height) {
          const cleanH = imgConfig.height.replace('px', '').trim();
          if (cleanH === 'auto') {
            imgElem.removeAttribute('height');
          } else {
            imgElem.setAttribute('height', cleanH);
          }
        }

        // --- 2d. Update Inline CSS Styles (width, height, max-width, max-height) ---
        const styleStr = imgElem.getAttribute('style') || '';
        const styleMap = new Map<string, string>();

        styleStr.split(';').forEach((rule) => {
          const colonIdx = rule.indexOf(':');
          if (colonIdx > 0) {
            const key = rule.slice(0, colonIdx).trim().toLowerCase();
            const val = rule.slice(colonIdx + 1).trim();
            if (key && val) styleMap.set(key, val);
          }
        });

        // Set or update CSS width
        if (imgConfig.width) {
          const wVal = imgConfig.width.includes('%')
            ? imgConfig.width.trim()
            : `${imgConfig.width.replace('px', '').trim()}px`;
          styleMap.set('width', wVal);
        }

        // Set or update CSS height
        if (imgConfig.height) {
          const hVal =
            imgConfig.height.trim() === 'auto'
              ? 'auto'
              : imgConfig.height.includes('%')
              ? imgConfig.height.trim()
              : `${imgConfig.height.replace('px', '').trim()}px`;
          styleMap.set('height', hVal);
        }

        // Set or update CSS max-width
        if (imgConfig.maxWidth) {
          const mwVal =
            imgConfig.maxWidth.includes('%') ||
            imgConfig.maxWidth.toLowerCase() === 'none' ||
            imgConfig.maxWidth.toLowerCase() === 'auto'
              ? imgConfig.maxWidth.trim()
              : `${imgConfig.maxWidth.replace('px', '').trim()}px`;
          styleMap.set('max-width', mwVal);
        }

        // Set or update CSS max-height
        if (imgConfig.maxHeight) {
          const mhVal =
            imgConfig.maxHeight.includes('%') ||
            imgConfig.maxHeight.toLowerCase() === 'none' ||
            imgConfig.maxHeight.toLowerCase() === 'auto'
              ? imgConfig.maxHeight.trim()
              : `${imgConfig.maxHeight.replace('px', '').trim()}px`;
          styleMap.set('max-height', mhVal);
        }

        // Reconstruct updated style attribute
        const newStyle = Array.from(styleMap.entries())
          .map(([k, v]) => `${k}: ${v}`)
          .join('; ');
        if (newStyle) {
          imgElem.setAttribute('style', newStyle);
        }

        // --- 2e. Handle <a href> link wrapping and removing ---
        const parentAnchor = imgElem.closest('a');

        if (imgConfig.hasLink && !imgConfig.removeLink && imgConfig.linkUrl) {
          if (parentAnchor) {
            // Update existing anchor href
            parentAnchor.setAttribute('href', imgConfig.linkUrl);
            if (!parentAnchor.getAttribute('target')) {
              parentAnchor.setAttribute('target', '_blank');
            }
          } else {
            // Wrap the img in a new anchor tag
            const newAnchor = doc.createElement('a');
            newAnchor.setAttribute('href', imgConfig.linkUrl);
            newAnchor.setAttribute('target', '_blank');
            newAnchor.setAttribute('style', 'text-decoration:none; border:0; display:inline-block;');
            
            if (imgElem.parentNode) {
              imgElem.parentNode.insertBefore(newAnchor, imgElem);
              newAnchor.appendChild(imgElem);
            }
          }
        } else if ((!imgConfig.hasLink || imgConfig.removeLink) && parentAnchor) {
          // Unwrap the image: replace parent <a> with the <img> element
          if (parentAnchor.parentNode) {
            parentAnchor.parentNode.insertBefore(imgElem, parentAnchor);
            parentAnchor.parentNode.removeChild(parentAnchor);
          }
        }
      }
    });
  });

  // Preserve DOCTYPE if present in the original HTML string
  const hasDoctype = /<!doctype html/i.test(html);
  const docHtml = doc.documentElement.outerHTML;
  return hasDoctype ? `<!DOCTYPE html>\n${docHtml}` : docHtml;
}
