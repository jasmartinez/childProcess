/**
 * 
 * @param collection 
 * @param callback 
 * @param options 
 */
export function buildPromiseArray<T>(collection: any[], callback: (item: any, options?: any) => Promise<any>, options: any = null): Promise<T>[] {
  try {
    if (collection) {
      const collectionParsed = (Array.isArray(collection)) ? collection : [collection];
      return collectionParsed.map((itemCollection: any) => callback(itemCollection, options));
    }
    return [];
  }
  catch (e) {
    console.error(e);
    return [];
  }
}