import childProcess from "child_process";

export class SpawnError extends Error {
  stdout: string;
  stderr: string;

  constructor(message: string, stdout: string, stderr: string) {
    super(message);
    this.stdout = stdout;
    this.stderr = stderr;
    // https://stackoverflow.com/a/41429145/239527
    Object.setPrototypeOf(this, SpawnError.prototype);
  }
}

export async function spawn(
  bin: string,
  args: string[],
  options: {
    writeStdin?: string;
    env?: Record<string, string>;
    log?: (text: string) => void;
  } = {}
): Promise<{
  stdout: string;
  stderr: string;
}> {
  options = {
    log: () => {
      // Do nothing
    },
    ...options,
  };

  const child = childProcess.spawn(bin, args, {
    // stdin stdout stderr
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      ...options.env,
    },
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (data) => {
    const text = data.toString();
    stdout += text;
    options.log(`stdout: ${text.trim()}`);
  });
  child.stderr.on("data", (data) => {
    const text = data.toString();
    stderr += text;
    options.log(`stderr: ${text.trim()}`);
  });

  if (options.writeStdin) {
    child.stdin.write(options.writeStdin);
    child.stdin.end();
  }

  // process.once('SIGTERM', () => {
  //   if (child.exitCode === null) {
  //     options.log(`sending SIGKILL to ${bin}`);
  //     child.kill('SIGKILL');
  //   }
  // });

  await new Promise<void>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    child.once("close", (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new SpawnError(
            `child process '${bin}' exited with non-zero: ${code}`,
            stdout,
            stderr
          )
        );
      }
    });
  });

  return {
    stdout,
    stderr,
  };
}
