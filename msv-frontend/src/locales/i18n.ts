import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 한국어 번역
const ko = {
  translation: {
    common: {
      login: '로그인',
      logout: '로그아웃',
      save: '저장',
      cancel: '취소',
      delete: '삭제',
      edit: '편집',
      create: '생성',
      search: '검색',
      loading: '로딩 중...',
      error: '오류',
      success: '성공',
      confirm: '확인',
      back: '뒤로',
      next: '다음',
      previous: '이전',
      close: '닫기',
      open: '열기',
      refresh: '새로고침',
      settings: '설정',
      profile: '프로필',
      dashboard: '대시보드',
      users: '사용자',
      menus: '메뉴',
      notifications: '알림',
      system: '시스템',
      help: '도움말',
      about: '정보'
    },
    auth: {
      loginTitle: 'MVS 3.0 로그인',
      loginSubtitle: '차세대 기업용 통합 업무 관리 시스템',
      userId: '사용자 ID',
      password: '비밀번호',
      loginButton: 'MVS 3.0 로그인',
      loginError: '로그인에 실패했습니다.',
      loginSuccess: '로그인 성공',
      invalidCredentials: '사용자 ID 또는 비밀번호가 올바르지 않습니다.',
      serverError: '서버 오류가 발생했습니다.'
    },
    dashboard: {
      title: 'MVS 3.0 대시보드',
      welcome: '안녕하세요, {{name}}님! 오늘도 좋은 하루 되세요.',
      totalUsers: '총 사용자',
      activeProjects: '활성 프로젝트',
      completedTasks: '완료된 작업',
      weeklyNew: '이번 주 신규',
      systemStatus: '시스템 상태',
      securityStatus: '보안 상태',
      performanceStatus: '성능 상태',
      aiService: 'AI 서비스',
      notificationService: '알림 서비스',
      recentNotifications: '최근 알림',
      normal: '정상',
      optimal: '최적',
      active: '활성',
      enterpriseFeatures: 'MVS 3.0 - 차세대 기업용 통합 업무 관리 시스템',
      multiTenant: '멀티 테넌트 아키텍처',
      enterpriseSecurity: '엔터프라이즈 보안',
      realtimeCollaboration: '실시간 협업',
      aiIntegration: 'AI 통합 분석'
    },
    users: {
      title: '사용자 관리',
      createUser: '사용자 생성',
      editUser: '사용자 편집',
      deleteUser: '사용자 삭제',
      username: '사용자명',
      email: '이메일',
      role: '역할',
      department: '부서',
      position: '직책',
      status: '상태',
      lastLogin: '마지막 로그인',
      actions: '작업',
      confirmDelete: '정말로 이 사용자를 삭제하시겠습니까?',
      userCreated: '사용자가 생성되었습니다.',
      userUpdated: '사용자가 업데이트되었습니다.',
      userDeleted: '사용자가 삭제되었습니다.'
    },
    menus: {
      title: '메뉴 관리',
      createMenu: '메뉴 생성',
      editMenu: '메뉴 편집',
      deleteMenu: '메뉴 삭제',
      menuName: '메뉴명',
      description: '설명',
      url: 'URL',
      icon: '아이콘',
      order: '순서',
      parentMenu: '상위 메뉴',
      isActive: '활성 상태',
      confirmDelete: '정말로 이 메뉴를 삭제하시겠습니까?',
      menuCreated: '메뉴가 생성되었습니다.',
      menuUpdated: '메뉴가 업데이트되었습니다.',
      menuDeleted: '메뉴가 삭제되었습니다.'
    },
    notifications: {
      title: '알림',
      markAsRead: '읽음으로 표시',
      markAllAsRead: '모두 읽음으로 표시',
      deleteNotification: '알림 삭제',
      noNotifications: '알림이 없습니다.',
      systemNotification: '시스템 알림',
      userNotification: '사용자 알림',
      notificationRead: '알림이 읽음으로 표시되었습니다.',
      notificationDeleted: '알림이 삭제되었습니다.'
    },
    errors: {
      networkError: '네트워크 오류가 발생했습니다.',
      serverError: '서버 오류가 발생했습니다.',
      unauthorized: '인증이 필요합니다.',
      forbidden: '접근 권한이 없습니다.',
      notFound: '요청한 리소스를 찾을 수 없습니다.',
      validationError: '입력값을 확인해주세요.',
      unknownError: '알 수 없는 오류가 발생했습니다.'
    }
  }
};

// 영어 번역
const en = {
  translation: {
    common: {
      login: 'Login',
      logout: 'Logout',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      search: 'Search',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      close: 'Close',
      open: 'Open',
      refresh: 'Refresh',
      settings: 'Settings',
      profile: 'Profile',
      dashboard: 'Dashboard',
      users: 'Users',
      menus: 'Menus',
      notifications: 'Notifications',
      system: 'System',
      help: 'Help',
      about: 'About'
    },
    auth: {
      loginTitle: 'MVS 3.0 Login',
      loginSubtitle: 'Next-Generation Enterprise Integrated Business Management System',
      userId: 'User ID',
      password: 'Password',
      loginButton: 'MVS 3.0 Login',
      loginError: 'Login failed.',
      loginSuccess: 'Login successful',
      invalidCredentials: 'Invalid user ID or password.',
      serverError: 'Server error occurred.'
    },
    dashboard: {
      title: 'MVS 3.0 Dashboard',
      welcome: 'Hello, {{name}}! Have a great day.',
      totalUsers: 'Total Users',
      activeProjects: 'Active Projects',
      completedTasks: 'Completed Tasks',
      weeklyNew: 'This Week New',
      systemStatus: 'System Status',
      securityStatus: 'Security Status',
      performanceStatus: 'Performance Status',
      aiService: 'AI Service',
      notificationService: 'Notification Service',
      recentNotifications: 'Recent Notifications',
      normal: 'Normal',
      optimal: 'Optimal',
      active: 'Active',
      enterpriseFeatures: 'MVS 3.0 - Next-Generation Enterprise Integrated Business Management System',
      multiTenant: 'Multi-Tenant Architecture',
      enterpriseSecurity: 'Enterprise Security',
      realtimeCollaboration: 'Real-time Collaboration',
      aiIntegration: 'AI Integration Analysis'
    },
    users: {
      title: 'User Management',
      createUser: 'Create User',
      editUser: 'Edit User',
      deleteUser: 'Delete User',
      username: 'Username',
      email: 'Email',
      role: 'Role',
      department: 'Department',
      position: 'Position',
      status: 'Status',
      lastLogin: 'Last Login',
      actions: 'Actions',
      confirmDelete: 'Are you sure you want to delete this user?',
      userCreated: 'User created successfully.',
      userUpdated: 'User updated successfully.',
      userDeleted: 'User deleted successfully.'
    },
    menus: {
      title: 'Menu Management',
      createMenu: 'Create Menu',
      editMenu: 'Edit Menu',
      deleteMenu: 'Delete Menu',
      menuName: 'Menu Name',
      description: 'Description',
      url: 'URL',
      icon: 'Icon',
      order: 'Order',
      parentMenu: 'Parent Menu',
      isActive: 'Active Status',
      confirmDelete: 'Are you sure you want to delete this menu?',
      menuCreated: 'Menu created successfully.',
      menuUpdated: 'Menu updated successfully.',
      menuDeleted: 'Menu deleted successfully.'
    },
    notifications: {
      title: 'Notifications',
      markAsRead: 'Mark as Read',
      markAllAsRead: 'Mark All as Read',
      deleteNotification: 'Delete Notification',
      noNotifications: 'No notifications.',
      systemNotification: 'System Notification',
      userNotification: 'User Notification',
      notificationRead: 'Notification marked as read.',
      notificationDeleted: 'Notification deleted.'
    },
    errors: {
      networkError: 'Network error occurred.',
      serverError: 'Server error occurred.',
      unauthorized: 'Authentication required.',
      forbidden: 'Access denied.',
      notFound: 'Requested resource not found.',
      validationError: 'Please check your input.',
      unknownError: 'Unknown error occurred.'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ko: ko,
      en: en
    },
    lng: 'ko', // 기본 언어
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;
