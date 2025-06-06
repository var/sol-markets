export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  enableTimestamp: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level ?? (process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG),
      enableColors: config.enableColors ?? process.env.NODE_ENV !== 'production',
      enableTimestamp: config.enableTimestamp ?? true,
    };
  }

  private formatMessage(level: string, message: string, context?: string): string {
    const timestamp = this.config.enableTimestamp ? new Date().toISOString() : '';
    const contextStr = context ? `[${context}]` : '';
    const parts = [timestamp, level, contextStr, message].filter(Boolean);
    return parts.join(' ');
  }

  private colorize(text: string, color: string): string {
    if (!this.config.enableColors) return text;
    
    const colors: Record<string, string> = {
      red: '\x1b[31m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      green: '\x1b[32m',
      reset: '\x1b[0m',
    };
    
    return `${colors[color]}${text}${colors.reset}`;
  }

  error(message: string, context?: string, error?: Error): void {
    if (this.config.level >= LogLevel.ERROR) {
      const formatted = this.formatMessage(this.colorize('ERROR', 'red'), message, context);
      console.error(formatted);
      if (error) {
        console.error(error.stack);
      }
    }
  }

  warn(message: string, context?: string): void {
    if (this.config.level >= LogLevel.WARN) {
      const formatted = this.formatMessage(this.colorize('WARN', 'yellow'), message, context);
      console.warn(formatted);
    }
  }

  info(message: string, context?: string): void {
    if (this.config.level >= LogLevel.INFO) {
      const formatted = this.formatMessage(this.colorize('INFO', 'blue'), message, context);
      console.log(formatted);
    }
  }

  debug(message: string, context?: string): void {
    if (this.config.level >= LogLevel.DEBUG) {
      const formatted = this.formatMessage(this.colorize('DEBUG', 'green'), message, context);
      console.log(formatted);
    }
  }

  success(message: string, context?: string): void {
    if (this.config.level >= LogLevel.INFO) {
      const formatted = this.formatMessage(this.colorize('SUCCESS', 'green'), message, context);
      console.log(formatted);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export factory for custom loggers
export const createLogger = (config?: Partial<LoggerConfig>) => new Logger(config); 