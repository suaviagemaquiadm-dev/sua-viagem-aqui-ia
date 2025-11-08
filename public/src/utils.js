/**
 * Gera o nome de um arquivo de imagem redimensionado pela extensão do Firebase Storage
 * e otimizado para o formato WebP.
 * @param {string} originalUrl A URL da imagem original.
 * @param {string} size O tamanho desejado (ex: '200x200').
 * @returns {string} A URL da imagem redimensionada e em WebP, ou a URL original se for inválida.
 */
export function getResizedImageUrl(originalUrl, size) {
  if (!originalUrl || !originalUrl.includes("firebasestorage.googleapis.com")) {
    return originalUrl;
  }

  try {
    // Decodifica a URL para manipular o nome do arquivo corretamente
    const decodedUrl = decodeURIComponent(originalUrl);
    // Separa a base da URL dos parâmetros de token
    const urlParts = decodedUrl.split("?");
    const baseUrl = urlParts[0];
    const queryParams = urlParts.length > 1 ? `?${urlParts[1]}` : "";

    // Adiciona o sufixo de redimensionamento antes da extensão do arquivo
    // Ex: .../my-image.jpg -> .../my-image_200x200.webp
    const resizedUrl = baseUrl.replace(/(\.[\w\d_-]+)$/i, `_${size}.webp`);

    // Codifica a URL de volta para um formato válido
    return encodeURI(resizedUrl) + queryParams;
  } catch (error) {
    console.error("Falha ao gerar URL de imagem redimensionada:", error);
    return originalUrl; // Retorna a URL original em caso de erro
  }
}
