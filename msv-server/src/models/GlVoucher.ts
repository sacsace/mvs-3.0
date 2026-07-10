import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface GlVoucherAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  voucher_no: string;
  voucher_type: 'journal' | 'payment' | 'receipt' | 'contra' | 'sales' | 'purchase';
  voucher_date: string;
  narration?: string | null;
  status: 'draft' | 'posted' | 'cancelled';
  source_type?: 'manual' | 'auto_voucher' | null;
  source_id?: number | null;
  total_debit: number;
  total_credit: number;
  posted_by?: number | null;
  posted_at?: Date | null;
  created_by?: number | null;
  updated_by?: number | null;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface GlVoucherCreationAttributes
  extends Optional<
    GlVoucherAttributes,
    | 'id'
    | 'narration'
    | 'status'
    | 'source_type'
    | 'source_id'
    | 'total_debit'
    | 'total_credit'
    | 'posted_by'
    | 'posted_at'
    | 'created_by'
    | 'updated_by'
    | 'is_active'
    | 'created_at'
    | 'updated_at'
  > {}

class GlVoucher extends Model<GlVoucherAttributes, GlVoucherCreationAttributes> implements GlVoucherAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public voucher_no!: string;
  public voucher_type!: 'journal' | 'payment' | 'receipt' | 'contra' | 'sales' | 'purchase';
  public voucher_date!: string;
  public narration?: string | null;
  public status!: 'draft' | 'posted' | 'cancelled';
  public source_type?: 'manual' | 'auto_voucher' | null;
  public source_id?: number | null;
  public total_debit!: number;
  public total_credit!: number;
  public posted_by?: number | null;
  public posted_at?: Date | null;
  public created_by?: number | null;
  public updated_by?: number | null;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

GlVoucher.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    voucher_no: { type: DataTypes.STRING(50), allowNull: false },
    voucher_type: {
      type: DataTypes.ENUM('journal', 'payment', 'receipt', 'contra', 'sales', 'purchase'),
      allowNull: false,
      defaultValue: 'journal',
    },
    voucher_date: { type: DataTypes.DATEONLY, allowNull: false },
    narration: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('draft', 'posted', 'cancelled'),
      allowNull: false,
      defaultValue: 'draft',
    },
    source_type: { type: DataTypes.ENUM('manual', 'auto_voucher'), allowNull: true },
    source_id: { type: DataTypes.INTEGER, allowNull: true },
    total_debit: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    total_credit: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    posted_by: { type: DataTypes.INTEGER, allowNull: true },
    posted_at: { type: DataTypes.DATE, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    tableName: 'gl_vouchers',
    underscored: true,
    timestamps: true,
  }
);

export default GlVoucher;
