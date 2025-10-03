import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface SalesOpportunityAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  customer_id: number;
  title: string;
  description?: string;
  value: number;
  probability: number;
  stage: string;
  expected_close_date: string;
  assigned_to?: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

interface SalesOpportunityCreationAttributes extends Optional<SalesOpportunityAttributes, 'id' | 'created_at' | 'updated_at'> {}

class SalesOpportunity extends Model<SalesOpportunityAttributes, SalesOpportunityCreationAttributes> implements SalesOpportunityAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public customer_id!: number;
  public title!: string;
  public description?: string;
  public value!: number;
  public probability!: number;
  public stage!: string;
  public expected_close_date!: string;
  public assigned_to?: number;
  public status!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

SalesOpportunity.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tenants',
        key: 'id',
      },
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id',
      },
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'customers',
        key: 'id',
      },
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    value: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    probability: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50,
    },
    stage: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'prospecting',
    },
    expected_close_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'sales_opportunities',
    timestamps: true,
    underscored: true,
  }
);

export default SalesOpportunity;
