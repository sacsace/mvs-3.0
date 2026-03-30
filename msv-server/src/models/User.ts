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
  position?: string;
  status: 'active' | 'inactive' | 'suspended';
  last_login?: Date;
  // 인사관리 필드
  employee_number?: string;
  birth_date?: Date;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  hire_date?: Date;
  employment_type?: 'fulltime' | 'contract' | 'parttime' | 'intern';
  salary?: number;
  is_payment_officer?: boolean;
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
  public position?: string;
  public status!: 'active' | 'inactive' | 'suspended';
  public last_login?: Date;
  // 인사관리 필드
  public employee_number?: string;
  public birth_date?: Date;
  public gender?: 'male' | 'female' | 'other';
  public phone?: string;
  public address?: string;
  public emergency_contact?: string;
  public emergency_phone?: string;
  public hire_date?: Date;
  public employment_type?: 'fulltime' | 'contract' | 'parttime' | 'intern';
  public salary?: number;
  public is_payment_officer?: boolean;
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
    hire_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    employment_type: {
      type: DataTypes.ENUM('fulltime', 'contract', 'parttime', 'intern'),
      allowNull: true
    },
    salary: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    is_payment_officer: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
      }
    ]
  }
);

export default User;
