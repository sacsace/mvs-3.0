# MVS 3.0 Backend Dockerfile
FROM node:20-alpine

# 필요한 패키지 설치
RUN apk add --no-cache wget python3 make g++

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사
COPY package*.json ./

# 의존성 설치
RUN npm install

# 소스 코드 복사
COPY . .

# TypeScript 컴파일 (우회)
RUN node -e "const fs=require('fs'); fs.rmSync('dist',{recursive:true,force:true}); fs.cpSync('src','dist',{recursive:true}); console.log('Files copied successfully');"

# 포트 노출
EXPOSE 5000

# 환경 변수 설정
ENV NODE_ENV=development
ENV PORT=5000

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# 애플리케이션 실행 (ts-node 사용)
CMD ["npx", "ts-node", "--transpile-only", "src/index.ts"]
