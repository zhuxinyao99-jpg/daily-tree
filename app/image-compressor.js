// app/image-compressor.js
const MAX_SIZE   = 800;   // px，最长边
const MAX_BYTES  = 300 * 1024; // 300KB
const QUALITY_HI = 0.8;
const QUALITY_LO = 0.6;

/**
 * 压缩图片文件，返回压缩后的 Blob
 * GIF 文件直接返回原始 Blob，不压缩
 */
export function compressImage(file) {
  if (file.type === 'image/gif') return Promise.resolve(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // 缩放到最长边 ≤ MAX_SIZE
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width >= height) { height = Math.round(height * MAX_SIZE / width); width = MAX_SIZE; }
        else                 { width  = Math.round(width  * MAX_SIZE / height); height = MAX_SIZE; }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      // 先用高质量，超出再降
      canvas.toBlob(blob => {
        if (blob && blob.size <= MAX_BYTES) { resolve(blob); return; }
        canvas.toBlob(blob2 => { resolve(blob2 ?? file); }, 'image/jpeg', QUALITY_LO);
      }, 'image/jpeg', QUALITY_HI);
    };
    img.onerror = reject;
    img.src = url;
  });
}
