import { Observable, Subject, BehaviorSubject } from "rxjs";
import { filter, take } from "rxjs/operators";
import { ChildProcess, fork, spawn } from "child_process";

export interface ProcessOptions {
  worker: string;
  workerOptions: any;
  workerMode: ChildProcessMode;
  env?: { [key: string]: string };
}
export interface ProcessOptionsChain{
  processOptions: ProcessOptions,
  callback?: (
    childProcessWrapper: ChildProcessWrapper,
    childProcessRef?: ChildProcess
  ) => void,
  callbackWithoutChildProcessRef? : boolean 
}

export enum ChildProcessEventEnum {
  data = "data",
  close = "close",
  disconnect = "disconnect",
  error = "error",
  exit = "exit",
  message = "message",
}

export type ChildProcessEvent =
  | ChildProcessEventEnum.data
  | ChildProcessEventEnum.close
  | ChildProcessEventEnum.disconnect
  | ChildProcessEventEnum.error
  | ChildProcessEventEnum.exit
  | ChildProcessEventEnum.message;

export enum ChildProcessModeEnum {
  fork = "fork",
  spawn = "spawn",
  exec = "exec",
}

export type ChildProcessMode =
  | ChildProcessModeEnum.fork
  | ChildProcessModeEnum.exec
  | ChildProcessModeEnum.spawn;

export interface ChildProcessEventObserver {
  type: ChildProcessEvent;
  data: any;
}

const defaultValues: ProcessOptions = {
  worker: "./workers/child.ts",
  workerOptions: {
    detached: true,
    shell: true,
    cwd: null,
  },
  workerMode: ChildProcessModeEnum.fork,
  env: {},
};

export async function buildChildProcessPromise(
  options: ProcessOptions,
  callback: (
    childProcessWrapper: ChildProcessWrapper,
    childProcessRef?: ChildProcess
  ) => void = null,
  callbackWithoutChildProcessRef = false
): Promise<ChildProcessEventObserver> {
  return new Promise((resolve, rejects) => {
    const childProcessWrapper = new ChildProcessWrapper(options);

    childProcessWrapper
      .getInternalStream(ChildProcessEventEnum.exit)
      .pipe(
        take(1),
        filter((event: ChildProcessEventObserver) => event.data.code === 0)
      )
      .subscribe((data: ChildProcessEventObserver) => {
        resolve(data);
      });

    childProcessWrapper
      .getInternalStream(ChildProcessEventEnum.exit)
      .pipe(
        take(1),
        filter((event: ChildProcessEventObserver) => event.data.code === 1)
      )
      .subscribe((data: ChildProcessEventObserver) => {
        rejects(data);
      });

    childProcessWrapper
      .getInternalStream(ChildProcessEventEnum.error)
      .pipe(take(1))
      .subscribe((data: ChildProcessEventObserver) => {
        rejects(data);
      });

    if (callback && callbackWithoutChildProcessRef) {
      callback(childProcessWrapper);
    }

    const childProcessRef = childProcessWrapper.buildProcess();

    if (callback && !callbackWithoutChildProcessRef) {
      callback(childProcessWrapper, childProcessRef);
    }
  });
}

export function buildChainOfProcesses(
  processOptionsChainArray: ProcessOptionsChain[]
): Promise<ChildProcessEventObserver> {
  try {
    if (
      Array.isArray(processOptionsChainArray) &&
      processOptionsChainArray.length > 0
    ) {
      return processOptionsChainArray.reduce(
        async (
          acum: Promise<any>,
          processOptionsChain: ProcessOptionsChain,
          index: number
        ) => {
          try {
            await acum.catch((e) => {
              console.error('Error in sequence element number'+ (index+1));
              throw e;
            });
            return buildChildProcessPromise(
              processOptionsChain.processOptions,
              processOptionsChain.callback,
              processOptionsChain.callbackWithoutChildProcessRef
            );
          } catch (e) {
            console.error(e);
            throw e;
          }
        },
        Promise.resolve(null)
      );
    }
    else{
      Promise.resolve(null);
    }
  } catch (e) {
    console.log("Error in chain of process");
    console.error(e);
    return Promise.reject(e);
  }
}

export class ChildProcessWrapper {
  referenceChild = null;
  outputWorker$ = new Subject<ChildProcessEventObserver>();
  init$ = new BehaviorSubject<boolean>(false);

  data$: Observable<ChildProcessEventObserver> = this.outputWorker$
    .asObservable()
    .pipe(
      filter((event: ChildProcessEventObserver) => event.type === ChildProcessEventEnum.data)
    );

  close$: Observable<ChildProcessEventObserver> = this.outputWorker$
    .asObservable()
    .pipe(
      filter((event: ChildProcessEventObserver) => event.type === ChildProcessEventEnum.close)
    );

  disconnect$: Observable<ChildProcessEventObserver> = this.outputWorker$
    .asObservable()
    .pipe(
      filter(
        (event: ChildProcessEventObserver) => event.type === ChildProcessEventEnum.disconnect
      )
    );

  error$: Observable<ChildProcessEventObserver> = this.outputWorker$
    .asObservable()
    .pipe(
      filter((event: ChildProcessEventObserver) => event.type === ChildProcessEventEnum.error)
    );

  message$: Observable<ChildProcessEventObserver> = this.outputWorker$
    .asObservable()
    .pipe(
      filter(
        (event: ChildProcessEventObserver) => event.type === ChildProcessEventEnum.message
      )
    );
  exit$: Observable<ChildProcessEventObserver> = this.outputWorker$
    .asObservable()
    .pipe(
      filter(
        (event: ChildProcessEventObserver) => event.type === ChildProcessEventEnum.exit
      )
    );

  internalStreamsMap = new Map<ChildProcessEvent, Observable<ChildProcessEventObserver>>([
    [ChildProcessEventEnum.data, this.data$],
    [ChildProcessEventEnum.close, this.close$],
    [ChildProcessEventEnum.disconnect, this.disconnect$],
    [ChildProcessEventEnum.error, this.error$],
    [ChildProcessEventEnum.message, this.message$],
    [ChildProcessEventEnum.exit, this.exit$],
  ]);

  constructor(private options: ProcessOptions = defaultValues) {
    this.setOptions(options);
  }

  setOptions(options: ProcessOptions) {
    if (options) {
      this.options = options;
    }
  }

  getInternalStream(name: ChildProcessEventEnum) {
    return this.internalStreamsMap.get(name);
  }

  buildProcess() {
    switch (this.options.workerMode) {
      case ChildProcessModeEnum.fork:
        this.referenceChild = fork(
          this.options.worker,
          this.options.workerOptions || {}
        );
        this.referenceChild.on(ChildProcessEventEnum.message, (data) => {
          this.outputWorker$.next({
            type: ChildProcessEventEnum.message,
            data,
          });
        });

        break;
      case ChildProcessModeEnum.spawn:
        this.referenceChild = spawn(
          this.options.worker,
          this.options.workerOptions || {}
        );
        this.referenceChild.stdout.on(ChildProcessEventEnum.data, (data) => {
          this.outputWorker$.next({
            type: ChildProcessEventEnum.data,
            data,
          });
        });

        break;
      default:
        throw "worker mode not valid";
        break;
    }
    this.setupProcessListeners();
    this.init$.next(true);
    return this.referenceChild;
  }

  setupProcessListeners() {
    this.referenceChild.on(ChildProcessEventEnum.close, (code) => {
      this.outputWorker$.next({
        type: ChildProcessEventEnum.close,
        data: {
          code,
        },
      });
      this.outputWorker$.complete();
    });

    this.referenceChild.on(ChildProcessEventEnum.error, (error) => {
      this.outputWorker$.next({
        type: ChildProcessEventEnum.error,
        data: {
          error,
        },
      });
    });

    this.referenceChild.on(ChildProcessEventEnum.exit, (code) => {
      this.outputWorker$.next({
        type: ChildProcessEventEnum.exit,
        data: {
          code,
        },
      });
      this.outputWorker$.complete();
    });
  }
}
