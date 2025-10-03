import { Sequelize } from 'sequelize';
import { env } from './env';
import { SYSTEM_CONSTANTS } from './constants';

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  logging: env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: SYSTEM_CONSTANTS.DB_POOL.MAX,
    min: SYSTEM_CONSTANTS.DB_POOL.MIN,
    acquire: SYSTEM_CONSTANTS.DB_POOL.ACQUIRE,
    idle: SYSTEM_CONSTANTS.DB_POOL.IDLE
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  },
  dialectOptions: {
    // SSL 설정 (Docker 환경에서는 완전히 비활성화)
    ssl: false,
    // PostgreSQL SSL 비활성화
    rejectUnauthorized: false
  }
});

export default sequelize;
