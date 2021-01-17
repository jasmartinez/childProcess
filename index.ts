import {
  buildChildProcessPromise,
  ChildProcessModeEnum,
} from "./process.factory";
async function main(env) {
  return buildChildProcessPromise(
  {
      worker: "./workers/child.ts",
      workerOptions: {
        detached: true,
        shell: true,
        env: {
          ...env,
          FOLDERS_TO_READ: JSON.stringify([
            "./files/testOne",
            "./files/testTwo",
          ]),
        },
      },
      workerMode: ChildProcessModeEnum.fork,
    });
}

main(process.env)
  .then((data) => {
    console.log(data);
  })
  .catch((data) => {
    console.log(data);
  });

}