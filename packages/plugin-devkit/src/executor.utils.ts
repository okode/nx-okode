export function interpolateOptions<T>(obj: T) {
  const objAsString = JSON.stringify(obj);
  const interpolatedString = objAsString
    .replace(/\$(\w+)/g, (_, key) => process.env[key] || '')
    .replace(/'/g, '"');
  return JSON.parse(interpolatedString) as T;
}
