export class Logger {
  constructor() {}

  private get date(): string {
    return new Date().toISOString();
  }

  info(message: string): void {
    console.log(this.date + ' - ' + message);
  }

  error(message: string, error?: Error): void {
    console.error(this.date + ' - ' + message + (error ? ': ' + error.stack : ''));
  }
}

export class WithLogger {
  protected readonly logger: Logger;
  constructor(logger: Logger) {
    this.logger = logger;
  }
}
