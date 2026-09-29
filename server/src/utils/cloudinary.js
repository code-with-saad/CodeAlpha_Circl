// Only images hosted in our own Cloudinary account are accepted as user content.
export const isOwnImage = (url) =>
  typeof url === 'string' && url.length < 500 && url.startsWith(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`);
