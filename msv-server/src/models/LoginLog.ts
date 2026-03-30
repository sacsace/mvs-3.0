import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface LoginLogAttributes {
  id: number;
  tenant_id?: number | null;
  company_id?: number | null;
  user_id?: number | null;
  userid?: string | null;
  status: 'success' | 'failure';
  reason?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  logged_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface LoginLogCreationAttributes
  extends Optional<LoginLogAttributes, 'id' | 'tenant_id' | 'company_id' | 'user_id' | 'userid' | 'reason' | 'ip_address' | 'user_agent' | 'logged_at' | 'created_at' | 'updated_at'> {}

class LoginLog extends Model<LoginLogAttributes, LoginLogCreationAttributes> implements LoginLogAttributes {
  public id!: number;
  public tenant_id?: number | null;
  public company_id?: number | null;
  public user_id?: number | null;
  public userid?: string | null;
  public status!: 'success' | 'failure';
  public reason?: string | null;
  public ip_address?: string | null;
  public user_agent?: string | null;
  public logged_at?: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

LoginLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    userid: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('success', 'failure'),
      allowNull: false
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    logged_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'login_logs',
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['company_id'] },
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['logged_at'] }
    ]
  }
);

export default LoginLog;
