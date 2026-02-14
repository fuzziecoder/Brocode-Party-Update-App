export function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function load<T>(key: string, fallback: T): T {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
}

export function remove(key: string) {
  localStorage.removeItem(key);
}
