import { Sequelize } from 'sequelize';
import { env } from './env';
import { SYSTEM_CONSTANTS } from './constants';

// Railway 환경 변수 우선 사용
const databaseUrl = process.env.DATABASE_URL;

const sequelize = databaseUrl 
  ? new Sequelize(databaseUrl, {
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
        // Railway PostgreSQL SSL 설정
        ssl: env.NODE_ENV === 'production' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      }
    })
  : new Sequelize({
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
        // 로컬 개발 환경 SSL 설정
        ssl: false,
        rejectUnauthorized: false
      }
    });

export default sequelize;
