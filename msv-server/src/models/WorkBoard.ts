import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface WorkBoardAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  name: string;
  description?: string;
  board_color?: string | null;
  created_by: number;
  created_at?: Date;
  updated_at?: Date;
}

interface WorkBoardCreationAttributes extends Optional<WorkBoardAttributes, 'id' | 'created_at' | 'updated_at' | 'description'> {}

class WorkBoard extends Model<WorkBoardAttributes, WorkBoardCreationAttributes> implements WorkBoardAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public name!: string;
  public description?: string;
  public board_color?: string | null;
  public created_by!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

WorkBoard.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    board_color: { type: DataTypes.STRING(7), allowNull: true, defaultValue: null },
    created_by: { type: DataTypes.INTEGER, allowNull: false }
  },
  {
    sequelize,
    tableName: 'work_boards',
    timestamps: true,
    underscored: true
  }
);

export default WorkBoard;
