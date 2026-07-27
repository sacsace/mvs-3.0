import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface UserAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  userid: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'root' | 'audit' | 'admin' | 'user';
  department?: string;
  department_id?: number | null;
  position?: string;
  status: 'active' | 'inactive' | 'suspended';
  last_login?: Date;
  /** 단일 동시 로그인 — 로그인마다 증가, JWT `sv`와 일치해야 유효 */
  session_version?: number;
  // 인사관리 필드
  employee_number?: string;
  birth_date?: Date;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  avatar_url?: string;
  hire_date?: Date;
  employment_type?: 'fulltime' | 'contract' | 'parttime' | 'intern' | 'daily';
  salary?: number;
  bank_name?: string;
  bank_account?: string;
  bank_ifsc?: string;
  is_payment_officer?: boolean;
  ot_eligible?: boolean;
  settings?: any;
  created_at?: Date;
  updated_at?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'created_at' | 'updated_at'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public userid!: string;
  public username!: string;
  public email!: string;
  public password_hash!: string;
  public role!: 'root' | 'audit' | 'admin' | 'user';
  public department?: string;
  public department_id?: number | null;
  public position?: string;
  public status!: 'active' | 'inactive' | 'suspended';
  public last_login?: Date;
  public session_version?: number;
  // 인사관리 필드
  public employee_number?: string;
  public birth_date?: Date;
  public gender?: 'male' | 'female' | 'other';
  public phone?: string;
  public address?: string;
  public emergency_contact?: string;
  public emergency_phone?: string;
  public avatar_url?: string;
  public hire_date?: Date;
  public employment_type?: 'fulltime' | 'contract' | 'parttime' | 'intern' | 'daily';
  public salary?: number;
  public bank_name?: string;
  public bank_account?: string;
  public bank_ifsc?: string;
  public is_payment_officer?: boolean;
  public ot_eligible?: boolean;
  public settings?: any;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userid: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('root', 'audit', 'admin', 'user'),
      allowNull: false,
      defaultValue: 'user'
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    position: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      allowNull: false,
      defaultValue: 'active'
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    },
    session_version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    // 인사관리 필드
    employee_number: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    birth_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    emergency_contact: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    emergency_phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    avatar_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    hire_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    employment_type: {
      type: DataTypes.ENUM('fulltime', 'contract', 'parttime', 'intern', 'daily'),
      allowNull: true
    },
    salary: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    bank_name: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    bank_account: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    bank_ifsc: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    is_payment_officer: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    ot_eligible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    settings: {
      type: DataTypes.JSON,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'users',
    indexes: [
      {
        fields: ['tenant_id', 'company_id']
      },
      {
        fields: ['userid']
      },
      {
        fields: ['email']
      },
      {
        fields: ['employee_number']
      },
      {
        name: 'users_status_userid_idx',
        fields: ['status', 'userid']
      }
    ]
  }
);

export default User;
