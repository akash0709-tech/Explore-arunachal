// ImageKit can resize on the fly with a "tr" query: photo.jpg?tr=w-600,q-75
// (the API already sends thumbnailUrl for homestays; this is for other images such as covers)
export function thumbnailUrl(url, width = 600, quality = 75) {
  if (!url) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}tr=w-${width},q-${quality}`;
}
