export function loadImage(source) {
  const image = new Image();
  image.decoding = 'async';
  image.src = source;

  return image;
}
