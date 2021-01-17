import fs from 'fs';
export interface DirectoryResponse {
  source: string,
  files: string[]
}
/**
 * 
 * @param path 
 */
export async function readDirectoryAsync(path: string): Promise<DirectoryResponse> {
  try {
    if (path) {
      return await new Promise((resolve, reject) => {
        fs.readdir(path, (error, files: string[]) => {
          if (error) {
            console.error(error);
            reject(null);
          }
          resolve({
            source: path,
            files
          });
        });
      });
    }
    else {
      throw "Reading directory:path not found";
    }
  }
  catch (e) {
    console.error(e);
    return null;
  }
}

/**
 * 
 * @param path 
 */
export async function readFileStream(path: string): Promise<string> {
  try {
    if (path) {
      const readStream = fs.createReadStream(path);
      const data = [];
      return await new Promise((resolve, reject) => {
        readStream.on('data', (chunk) => {
          data.push(chunk);
        });

        readStream.on('end', () => {
          resolve(Buffer.concat(data).toString());
        });

        readStream.on('error', (err) => {
          console.log('error :', err);
          reject(null);
        });
      });
    }
    else {
      throw "Reading File: path not found";
    }
  }
  catch (e) {
    console.error(e);
    return null;
  }
}