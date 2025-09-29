import { Sequelize } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Menu from './Menu';

// 관계 설정
User.hasMany(Menu, { foreignKey: 'tenant_id', as: 'menus' });
Menu.belongsTo(User, { foreignKey: 'tenant_id', as: 'tenant' });

// 데이터베이스 연결 테스트
const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await sequelize.authenticate();
      console.log('✅ 데이터베이스 연결 성공');
      
      // 개발 환경에서만 테이블 동기화
      if (process.env.NODE_ENV === 'development') {
        await sequelize.sync({ alter: true });
        console.log('✅ 데이터베이스 테이블 동기화 완료');
      }
      return;
    } catch (error) {
      retries++;
      console.error(`❌ 데이터베이스 연결 실패 (시도 ${retries}/${maxRetries}):`, error.message);
      
      if (retries >= maxRetries) {
        console.error('❌ 최대 재시도 횟수 초과. 서버를 계속 실행합니다.');
        return;
      }
      
      console.log(`⏳ ${5000 * retries}ms 후 재시도...`);
      await new Promise(resolve => setTimeout(resolve, 5000 * retries));
    }
  }
};

export { sequelize, User, Menu, connectDB };
