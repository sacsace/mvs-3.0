import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface CompanyAttributes {
  id: number;
  tenant_id: number;
  name: string;
  business_number: string;
  ceo_name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  industry?: string;
  size?: 'small' | 'medium' | 'large' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended';
  created_at?: Date;
  updated_at?: Date;
}

interface CompanyCreationAttributes extends Optional<CompanyAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Company extends Model<CompanyAttributes, CompanyCreationAttributes> implements CompanyAttributes {
  public id!: number;
  public tenant_id!: number;
  public name!: string;
  public business_number!: string;
  public ceo_name!: string;
  public address!: string;
  public phone!: string;
  public email!: string;
  public website?: string;
  public industry?: string;
  public size?: 'small' | 'medium' | 'large' | 'enterprise';
  public status!: 'active' | 'inactive' | 'suspended';
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Company.init(
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
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    business_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    ceo_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    website: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    industry: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    size: {
      type: DataTypes.ENUM('small', 'medium', 'large', 'enterprise'),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      allowNull: false,
      defaultValue: 'active'
    }
  },
  {
    sequelize,
    tableName: 'companies',
    indexes: [
      {
        fields: ['tenant_id']
      },
      {
        fields: ['business_number']
      },
      {
        fields: ['name']
      }
    ]
  }
);

export default Company;
