// Simple promise-based mutex for serializing async operations
export class Mutex {
  private promise: Promise<void> = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.promise.then(() => fn());
    this.promise = run.then(
      () => {},
      () => {}
    );
    return run;
  }
}
