declare module 'node:buffer' {
  export class Buffer extends Uint8Array {
    static alloc(size: number): Buffer;
    static concat(chunks: ReadonlyArray<Uint8Array>): Buffer;
    static from(value: string | Uint8Array, encoding?: 'utf8'): Buffer;
    readonly length: number;
    equals(other: Uint8Array): boolean;
    readUInt32LE(offset: number): number;
    subarray(start?: number, end?: number): Buffer;
    toString(encoding?: 'utf8'): string;
    writeUInt16LE(value: number, offset: number): number;
    writeUInt32LE(value: number, offset: number): number;
  }
}

declare module 'node:crypto' {
  interface Hash {
    update(value: Uint8Array | string): Hash;
    digest(encoding: 'hex'): string;
  }

  export function createHash(algorithm: 'sha256'): Hash;
}

declare module 'node:fs/promises' {
  import type { Buffer } from 'node:buffer';

  export function mkdir(
    path: string,
    options: { readonly recursive: true },
  ): Promise<string | undefined>;
  export function mkdtemp(prefix: string): Promise<string>;
  export function readFile(path: string): Promise<Buffer>;
  export function readFile(path: string, encoding: 'utf8'): Promise<string>;
  export function rm(
    path: string,
    options: { readonly recursive: true; readonly force: true },
  ): Promise<void>;
  export function stat(path: string): Promise<unknown>;
  export function writeFile(
    path: string,
    data: string | Uint8Array,
    encoding?: 'utf8',
  ): Promise<void>;
}

declare module 'node:os' {
  export function tmpdir(): string;
}

declare module 'node:path' {
  export function dirname(path: string): string;
  export function isAbsolute(path: string): boolean;
  export function join(...paths: ReadonlyArray<string>): string;
  export function relative(from: string, to: string): string;
  export function resolve(...paths: ReadonlyArray<string>): string;
}

declare module 'node:url' {
  export function fileURLToPath(url: URL): string;
}

declare module 'node:process' {
  interface ProcessValue {
    readonly execPath: string;
    readonly env: Readonly<Record<string, string | undefined>>;
  }

  const process: ProcessValue;
  export default process;
}

declare module 'node:child_process' {
  interface ReadableTextStream {
    setEncoding(encoding: 'utf8'): void;
    on(event: 'data', listener: (chunk: string) => void): void;
  }

  interface ChildProcess {
    readonly stdout: ReadableTextStream;
    readonly stderr: ReadableTextStream;
    once(event: 'error', listener: (error: Error) => void): void;
    once(event: 'close', listener: (status: number | null) => void): void;
  }

  interface SpawnOptions {
    readonly cwd: string;
    readonly env: Readonly<Record<string, string | undefined>>;
    readonly stdio: readonly ['ignore', 'pipe', 'pipe'];
  }

  export function spawn(
    command: string,
    args: ReadonlyArray<string>,
    options: SpawnOptions,
  ): ChildProcess;
}
