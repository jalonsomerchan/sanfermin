export function readNumber(key, fallback = 0) {
  const value = Number.parseFloat(localStorage.getItem(key) ?? '');

  return Number.isFinite(value) ? value : fallback;
}

export function writeNumber(key, value) {
  localStorage.setItem(key, String(value));
}

export function readObject(key, fallback = {}) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '');

    return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writeObject(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function readString(key, fallback = '') {
  return localStorage.getItem(key) ?? fallback;
}

export function writeString(key, value) {
  localStorage.setItem(key, value);
}
