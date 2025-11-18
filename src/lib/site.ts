export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://instantlychef.com";

export const getSiteUrl = (path = "/") => {
  try {
    const base = SITE_URL.endsWith("/") ? SITE_URL.slice(0, -1) : SITE_URL;
    const cleanedPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${cleanedPath}`;
  } catch {
    return path;
  }
};
