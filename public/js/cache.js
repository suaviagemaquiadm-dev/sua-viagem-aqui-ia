/**
 * Salva um valor no localStorage com um tempo de vida (TTL - Time To Live).
 * @param {string} key A chave para salvar o item.
 * @param {any} value O valor a ser salvo.
 * @param {number} ttl O tempo de vida em milissegundos.
 */
export function setWithTTL(key, value, ttl) {
  const now = new Date();
  const item = {
    value: value,
    expiry: now.getTime() + ttl,
  };
  localStorage.setItem(key, JSON.stringify(item));
}

/**
 * Recupera um valor do localStorage, retornando null se estiver expirado.
 * @param {string} key A chave do item a ser recuperado.
 * @returns {any | null} O valor armazenado ou null se não existir ou estiver expirado.
 */
export function getWithTTL(key) {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) {
    return null;
  }
  try {
    const item = JSON.parse(itemStr);
    const now = new Date();
    if (now.getTime() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  } catch (error) {
    // Se o JSON estiver corrompido, remove o item
    console.error(`Cache corrompido para a chave '${key}':`, error);
    localStorage.removeItem(key);
    return null;
  }
}
