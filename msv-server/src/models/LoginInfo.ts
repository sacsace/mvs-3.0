import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface LoginInfoAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  division: string;
  login_id: string;
  password: string;
  open_file_returns?: string;
  url?: string;
  created_by?: number;
  updated_by?: number;
  created_at?: Date;
  updated_at?: Date;
}

interface LoginInfoCreationAttributes
  extends Optional<LoginInfoAttributes, 'id' | 'open_file_returns' | 'url' | 'created_by' | 'updated_by' | 'created_at' | 'updated_at'> {}

class LoginInfo extends Model<LoginInfoAttributes, LoginInfoCreationAttributes> implements LoginInfoAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public division!: string;
  public login_id!: string;
  public password!: string;
  public open_file_returns?: string;
  public url?: string;
  public created_by?: number;
  public updated_by?: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

LoginInfo.init(
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
    division: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    login_id: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    open_file_returns: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'login_infos',
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['company_id'] }
    ]
  }
);

export default LoginInfo;
