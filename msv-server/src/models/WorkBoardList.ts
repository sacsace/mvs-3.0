import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface WorkBoardListAttributes {
  id: number;
  board_id: number;
  title: string;
  position: number;
  created_at?: Date;
  updated_at?: Date;
}

interface WorkBoardListCreationAttributes extends Optional<WorkBoardListAttributes, 'id' | 'created_at' | 'updated_at' | 'position'> {}

class WorkBoardList extends Model<WorkBoardListAttributes, WorkBoardListCreationAttributes> implements WorkBoardListAttributes {
  public id!: number;
  public board_id!: number;
  public title!: string;
  public position!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

WorkBoardList.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    board_id: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(120), allowNull: false },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
  },
  {
    sequelize,
    tableName: 'work_board_lists',
    timestamps: true,
    underscored: true
  }
);

export default WorkBoardList;
