import { Request } from 'express';
import { User } from '../models';

export interface AuthRequest extends Request {
  user: User;
}

export interface RequestWithUser extends Request {
  user: {
    id: number;
    tenant_id: number;
    company_id: number;
    userid: string;
    username: string;
    email: string;
    role: 'root' | 'audit' | 'admin' | 'user';
    department?: string;
    position?: string;
    status: 'active' | 'inactive' | 'suspended';
    last_login?: Date;
    created_at?: Date;
    updated_at?: Date;
  };
}
