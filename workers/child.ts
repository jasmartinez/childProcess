import { readDirectoryAsync, readFileStream, DirectoryResponse } from '../tools/file-utils';
import { safeJSONParse } from '../tools/serializable-utils';
import { buildPromiseArray } from '../tools/promise-utils';
try {
  process.on('message', (msg) => {
    console.log('Message from parent:', msg);
  });

  if (process.env && process.env.FOLDERS_TO_READ) {
    const folders: string[] = safeJSONParse(process.env.FOLDERS_TO_READ);
    const foldersPromisesArray: Promise<DirectoryResponse>[] = buildPromiseArray(folders, readDirectoryAsync);
    Promise.all(foldersPromisesArray)
      .then((directories: DirectoryResponse[]) => {
        const result: Promise<any>[] = [];
        directories.forEach((directory: DirectoryResponse) => {
          const paths = directory.files.map((file:string)=> `${directory.source}/${file}`); 
          result.push(Promise.all(buildPromiseArray(paths, readFileStream)))
        });
        Promise.all(result)
          .then((directories) => {
            process.exit(0);
          })
          .catch((error) => {
            console.error(error);
            process.exit(1);
          })
      })
      .catch((e) => {
        console.log(e);
        process.exit(1);
      })
  }
  else {
    process.exit(0);
  }
}
catch (e) {
  console.error(e);
  process.exit(1);
}



