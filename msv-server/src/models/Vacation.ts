import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface VacationAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  user_id: number;
  vacation_type: 'annual' | 'sick' | 'personal' | 'study' | 'maternity' | 'paternity';
  start_date: Date;
  end_date: Date;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  applied_date: Date;
  approved_by?: number;
  approved_date?: Date;
  rejection_reason?: string;
  attachments?: string;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface VacationCreationAttributes extends Optional<VacationAttributes, 'id' | 'approved_by' | 'approved_date' | 'rejection_reason' | 'attachments' | 'created_at' | 'updated_at'> {}

class Vacation extends Model<VacationAttributes, VacationCreationAttributes> implements VacationAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public user_id!: number;
  public vacation_type!: 'annual' | 'sick' | 'personal' | 'study' | 'maternity' | 'paternity';
  public start_date!: Date;
  public end_date!: Date;
  public days!: number;
  public reason!: string;
  public status!: 'pending' | 'approved' | 'rejected' | 'cancelled';
  public applied_date!: Date;
  public approved_by?: number;
  public approved_date?: Date;
  public rejection_reason?: string;
  public attachments?: string;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Vacation.init(
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
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    vacation_type: {
      type: DataTypes.ENUM('annual', 'sick', 'personal', 'study', 'maternity', 'paternity'),
      allowNull: false
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    days: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    applied_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    approved_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    attachments: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'vacations',
    indexes: [
      {
        fields: ['tenant_id', 'company_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['start_date', 'end_date']
      }
    ]
  }
);

export default Vacation;







