export class WorkDeadlineExceeded extends Error {
  constructor() { super('Analytics work deadline exceeded'); }
}

export class WorkBudget {
  private readonly controller = new AbortController();
  private readonly timer: ReturnType<typeof setTimeout>;
  readonly signal = this.controller.signal;
  constructor(milliseconds: number) {
    this.timer = setTimeout(() => this.controller.abort(), Math.max(0, milliseconds));
    if (milliseconds <= 0) this.controller.abort();
  }
  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.signal.aborted) throw new WorkDeadlineExceeded();
    return new Promise<T>((resolve, reject) => {
      const abort = () => reject(new WorkDeadlineExceeded());
      this.signal.addEventListener('abort', abort, { once: true });
      Promise.resolve().then(() => {
        if (this.signal.aborted) throw new WorkDeadlineExceeded();
        return work();
      }).then(resolve, reject).finally(() => this.signal.removeEventListener('abort', abort));
    });
  }
  close() { clearTimeout(this.timer); this.controller.abort(); }
}

// Invocation-local facade: bounds credential resolution as well as HTTP work.
// SDK transport receives the same cancellation signal. Never cache this facade.
export function budgetClient<T extends { send: (...args: any[]) => any }>(client: T, budget: WorkBudget): T {
  return new Proxy(client, {
    get(target, property, receiver) {
      if (property === 'send') return (command: unknown) => budget.run(() =>
        target.send(command, { abortSignal: budget.signal }));
      return Reflect.get(target, property, receiver);
    },
  });
}
