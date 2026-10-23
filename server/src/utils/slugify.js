/**
 * Generate a URL-friendly slug from a text string.
 *
 * @param {string} text - Raw string to slugify
 * @returns {string} Lowercase, kebab-cased slug
 */
export function slugify(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with single hyphen first
    .replace(/[^a-z0-9-]/g, '') // Remove non-alphanumeric chars (keep hyphens)
    .replace(/-+/g, '-') // Collapse consecutive hyphens
    .replace(/^-+|-+$/g, ''); // Trim leading and trailing hyphens
}

export default slugify;
