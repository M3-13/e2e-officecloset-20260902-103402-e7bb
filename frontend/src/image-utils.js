function getApiBase() {
  let env = {};
  try {
    env = import.meta.env || {};
  } catch {
    env = {};
  }
  const base = env.VITE_API_URL || "http://localhost:8000";
  return base.replace(/\/+$/, "");
}

export function resolveImageUrl(imageUrl) {
  if (!imageUrl) {
    return null;
  }
  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }
  return `${getApiBase()}${imageUrl}`;
}
