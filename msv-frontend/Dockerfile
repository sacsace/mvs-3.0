# MVS 3.0 Frontend Dockerfile
# Multi-stage build for production optimization

# Build stage
FROM node:20-alpine as build

# 환경 변수 설정 (인코딩)
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

WORKDIR /app

# 패키지 파일 복사
COPY package*.json ./

# 의존성 설치
RUN npm install --legacy-peer-deps

# 소스 코드 복사
COPY . .

# public 폴더 확인
RUN ls -la /app/public/

# 환경 변수 설정
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV GENERATE_SOURCEMAP=false
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

# 애플리케이션 빌드
RUN npm run build

# Production stage
FROM nginx:alpine

# 환경 변수 설정 (인코딩)
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# Nginx 설정 파일 복사
COPY nginx.conf /etc/nginx/nginx.conf

# 빌드된 파일 복사
COPY --from=build /app/build /usr/share/nginx/html

# 포트 노출
EXPOSE 80

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]
