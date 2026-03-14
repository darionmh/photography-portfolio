/** Home route shows all images from storage root (primary feed). */
export const HOME_PAGE = "__all__";

export function pathForGallery(gallery: string): string {
  return gallery === HOME_PAGE ? "/" : `/${gallery}`;
}

export function formatGalleryName(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
