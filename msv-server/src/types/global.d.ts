// Global type definitions for MVS 3.0 Backend

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: string;
    DB_HOST: string;
    DB_PORT: string;
    DB_NAME: string;
    DB_USER: string;
    DB_PASSWORD: string;
    JWT_SECRET: string;
    SESSION_SECRET: string;
    CORS_ORIGIN: string;
    REDIS_HOST: string;
    REDIS_PORT: string;
    UPLOAD_PATH: string;
    MAX_FILE_SIZE: string;
    LOG_LEVEL: string;
    EMAIL_HOST?: string;
    EMAIL_PORT?: string;
    EMAIL_USER?: string;
    EMAIL_PASS?: string;
    SMS_API_KEY?: string;
    SMS_API_SECRET?: string;
    OPENAI_API_KEY?: string;
    HEALTH_CHECK_INTERVAL?: string;
    HEALTH_CHECK_TIMEOUT?: string;
    HTTPS?: string;
  }
}

// Express types
declare module 'express' {
  export interface Request {
    user?: any;
    tenantId?: number;
  }
  export interface Response {
    json: (body?: any) => Response;
    status: (code: number) => Response;
    send: (body?: any) => Response;
  }
  export interface NextFunction {
    (err?: any): void;
  }
  export interface Router {
    get: (path: string, ...handlers: any[]) => Router;
    post: (path: string, ...handlers: any[]) => Router;
    put: (path: string, ...handlers: any[]) => Router;
    delete: (path: string, ...handlers: any[]) => Router;
    patch: (path: string, ...handlers: any[]) => Router;
    use: (path: string | any, ...handlers: any[]) => Router;
  }
  export interface Application {
    use: (path: string | any, ...handlers: any[]) => Application;
    get: (path: string, ...handlers: any[]) => Application;
    post: (path: string, ...handlers: any[]) => Application;
    put: (path: string, ...handlers: any[]) => Application;
    delete: (path: string, ...handlers: any[]) => Application;
    patch: (path: string, ...handlers: any[]) => Application;
    listen: (port: number, callback?: () => void) => any;
  }
  export function Router(): Router;
  export function json(): any;
  export function urlencoded(options: any): any;
  export function static(root: string): any;
}

// Sequelize types
declare module 'sequelize' {
  export interface DataTypes {
    STRING: any;
    INTEGER: any;
    BOOLEAN: any;
    DATE: any;
    TEXT: any;
    DECIMAL: any;
    JSON: any;
    ENUM: any;
    UUID: any;
    UUIDV4: any;
  }
  
  export interface Model {
    init(attributes: any, options: any): any;
    findAll(options?: any): Promise<any[]>;
    findOne(options?: any): Promise<any | null>;
    findByPk(id: any, options?: any): Promise<any | null>;
    create(values: any, options?: any): Promise<any>;
    update(values: any, options: any): Promise<[number, any[]]>;
    destroy(options: any): Promise<number>;
    count(options?: any): Promise<number>;
    sum(field: string, options?: any): Promise<number>;
    belongsTo(target: any, options?: any): any;
    hasMany(target: any, options?: any): any;
    belongsToMany(target: any, options?: any): any;
  }
  
  export interface Optional {
    id?: number;
    created_at?: Date;
    updated_at?: Date;
  }
  
  export interface Op {
    eq: any;
    ne: any;
    gt: any;
    gte: any;
    lt: any;
    lte: any;
    between: any;
    notBetween: any;
    in: any;
    notIn: any;
    like: any;
    notLike: any;
    iLike: any;
    notILike: any;
    startsWith: any;
    endsWith: any;
    substring: any;
    regexp: any;
    notRegexp: any;
    iRegexp: any;
    notIRegexp: any;
    and: any;
    or: any;
    not: any;
  }
  
  export class Sequelize {
    constructor(options: any);
    authenticate(): Promise<void>;
    sync(options?: any): Promise<any>;
    define(name: string, attributes: any, options?: any): any;
    transaction(callback: (t: any) => Promise<any>): Promise<any>;
    close(): Promise<void>;
  }
  
  export const Op: Op;
  export const DataTypes: DataTypes;
}

// Socket.IO types
declare module 'socket.io' {
  export interface Server {
    on(event: string, listener: (socket: Socket) => void): Server;
    emit(event: string, ...args: any[]): Server;
    to(room: string): Server;
  }
  
  export interface Socket {
    id: string;
    handshake: any;
    on(event: string, listener: (...args: any[]) => void): Socket;
    emit(event: string, ...args: any[]): Socket;
    join(room: string): Socket;
    leave(room: string): Socket;
    to(room: string): Socket;
  }
  
  export function Server(server: any, options?: any): Server;
}

// Custom types
export interface AuthRequest extends Express.Request {
  user?: any;
  tenantId?: number;
}

export interface AuthenticatedSocket extends Socket {
  user?: any;
  tenantId?: number;
}