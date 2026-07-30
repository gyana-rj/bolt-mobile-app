// IndexedDB cache for a WebContainer's installed node_modules (too large for
// localStorage). Keyed by a hash of the project's dependencies, so the same
// deps reuse the snapshot and skip npm install; different deps install fresh.

const DB_NAME = "webcontainer-snapshot-cache";
const STORE_NAME = "node_modules";
const DB_VERSION = 1;

// Bump to invalidate every cached snapshot (e.g. if the install flags change).
const CACHE_VERSION = "v2";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Returns the cached snapshot for `key`, or undefined on a miss / any failure.
export async function getSnapshot(
  key: string,
): Promise<Uint8Array | undefined> {
  try {
    const db = await openDb();
    return await new Promise<Uint8Array | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () =>
        resolve(request.result as Uint8Array | undefined);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return undefined;
  }
}

// Stores a snapshot. Best-effort: silently no-ops if IndexedDB is unavailable
// or the write exceeds the storage quota.
export async function putSnapshot(
  key: string,
  data: Uint8Array,
): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(data, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    // Caching is an optimization; ignore failures.
  }
}

// Hashes the dependency set from a package.json so the cache key changes only
// when dependencies change (not when app source changes).
export async function hashDependencies(
  packageJsonContents: string,
): Promise<string> {
  let depsKey: string;
  try {
    const pkg = JSON.parse(packageJsonContents) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    depsKey = JSON.stringify({
      dependencies: pkg.dependencies ?? {},
      devDependencies: pkg.devDependencies ?? {},
    });
  } catch {
    depsKey = packageJsonContents;
  }

  const bytes = new TextEncoder().encode(`${CACHE_VERSION}:${depsKey}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
