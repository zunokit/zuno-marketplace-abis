import { env } from "@/shared/config/env";

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private static instance: Logger;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = env.NODE_ENV === "development";
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : "";
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const formattedMessage = this.formatMessage(level, message, context);

    switch (level) {
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(formattedMessage);
        }
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
  }

  public debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  public info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  public warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  public error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    };
    this.log(LogLevel.ERROR, message, errorContext);
  }

  // Specific method for API requests
  public apiRequest(method: string, path: string, context?: LogContext): void {
    this.info(`API Request: ${method} ${path}`, context);
  }

  // Specific method for API responses
  public apiResponse(method: string, path: string, statusCode: number, duration: number): void {
    this.info(`API Response: ${method} ${path} - ${statusCode} (${duration}ms)`);
  }

  // Specific method for database queries
  public dbQuery(query: string, duration?: number): void {
    const context = duration ? { duration: `${duration}ms` } : undefined;
    this.debug(`DB Query: ${query}`, context);
  }

  // Specific method for cache operations
  public cache(operation: string, key: string, hit?: boolean): void {
    const context = hit !== undefined ? { hit } : undefined;
    this.debug(`Cache ${operation}: ${key}`, context);
  }
}

export const logger = Logger.getInstance();
