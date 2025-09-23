// Dynamic import for DOMPurify - only loaded when needed
let DOMPurify = null;

export async function sanitizeHTML(dirty) {
  if (!DOMPurify) {
    const module = await import('dompurify');
    DOMPurify = module.default;
  }
  return DOMPurify.sanitize(dirty);
}

export async function sanitizeInput(input) {
  if (!DOMPurify) {
    const module = await import('dompurify');
    DOMPurify = module.default;
  }

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
}