// Este arquivo deve conter funções utilitárias gerais.

/**
 * Gera uma URL para uma imagem redimensionada.
 * Assume que a imagem original está em um serviço de armazenamento que suporta redimensionamento via URL.
 * Ex: Cloudinary, Firebase Storage com funções de redimensionamento, etc.
 *
 * @param {string} originalUrl A URL original da imagem.
 * @param {string} size A string de tamanho no formato "WxH" (ex: "400x300").
 * @returns {string} A URL da imagem redimensionada.
 */
export function getResizedImageUrl(originalUrl, size) {
  if (!originalUrl) {
    return null;
  }
  // TODO: Implementar a lógica real de redimensionamento de URL.
  // Isso dependerá do serviço de armazenamento de imagens que está sendo usado.
  // Por exemplo, para Firebase Storage com uma função de redimensionamento:
  // return `https://your-image-resizer-function.cloudfunctions.net/resizeImage?url=${encodeURIComponent(originalUrl)}&size=${size}`;

  // Por enquanto, retorna a URL original como fallback.
  console.warn(`getResizedImageUrl: Implementação de redimensionamento pendente. Retornando URL original para ${originalUrl} com tamanho ${size}`);
  return originalUrl;
}

// Você pode adicionar outras funções utilitárias aqui.
