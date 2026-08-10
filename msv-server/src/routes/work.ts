import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { ensureUploadRoot } from '../utils/uploadPath';
import {
  getWorkStatistics,
  getWorkStatistic,
  createWorkStatistic,
  updateWorkStatistic,
  deleteWorkStatistic,
} from '../controllers/workStatisticController';
import {
  getApprovals,
  getApproval,
  createApproval,
  updateApproval,
  deleteApproval,
  submitApproval,
  approveApproval,
  rejectApproval,
  escalateApproval,
  addComment,
} from '../controllers/approvalController';
import {
  getApprovalTypes,
  createApprovalType,
  updateApprovalType,
  deleteApprovalType,
} from '../controllers/approvalTypeController';
import {
  getRoomBookings,
  getRoomBooking,
  createRoomBooking,
  updateRoomBooking,
  deleteRoomBooking,
  confirmRoomBooking,
  cancelRoomBooking,
} from '../controllers/roomBookingController';
import {
  getRoomTypes,
  createRoomType,
  updateRoomType,
  deleteRoomType,
} from '../controllers/roomTypeController';
import {
  getRoomTypeRooms,
  upsertRoomTypeRoom,
} from '../controllers/roomTypeRoomController';
import {
  getWorkReports,
  getWorkReport,
  createWorkReport,
  updateWorkReport,
  deleteWorkReport,
  submitWorkReport,
  reviewWorkReport,
} from '../controllers/workReportController';
import {
  getWorkBoards,
  createWorkBoard,
  getWorkBoardDetail,
  updateWorkBoard,
  deleteWorkBoard,
  moveWorkBoard,
  createWorkBoardList,
  updateWorkBoardList,
  moveWorkBoardList,
  deleteWorkBoardList,
  createWorkBoardCard,
  updateWorkBoardCard,
  moveWorkBoardCard,
  deleteWorkBoardCard,
  getWorkBoardCardComments,
  createWorkBoardCardComment,
  deleteWorkBoardCardComment,
  getWorkBoardMembers,
  inviteWorkBoardMember,
  removeWorkBoardMember,
  updateWorkBoardMember,
} from '../controllers/workBoardController';
import {
  getWorkAssigneeList,
  createWorkAssignee,
  updateWorkAssignee,
  deleteWorkAssignee,
  moveWorkAssignee,
  createWorkAssigneeItem,
  updateWorkAssigneeItem,
  deleteWorkAssigneeItem,
  moveWorkAssigneeItem,
} from '../controllers/workAssigneeListController';
import { authenticateToken, restrictAuditToReadOnly } from '../middleware/auth';
import { requireMenuPermission, requireMenuPermissionAny } from '../middleware/menuPermission';

/** DB `menus.route` 값과 동일 (프론트 App 라우트 기준) */
const MENU_WORK_PROJECTS = '/work/projects';
const MENU_WORK_ASSIGNEE_LIST = '/work/assignee-list';
const MENU_WORK_STATISTICS = '/work/statistics';
const MENU_WORK_APPROVAL = '/work/approval';
/** 객실 예약·호실·예약현황: 업무/호텔 메뉴에 동일·연관 화면이 여러 줄로 존재 → API는 후보 중 하나 권한으로 허용 */
const MENU_ROOM_RESERVATION_ROUTES = [
  '/work/room-reservation',
  '/hotel/room-reservation',
  '/hotel/reservations',
];
const MENU_WORK_REPORTS = '/work/reports';

const router = Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

// 작업 보드 (칸반 / 트렐로형) — 메뉴 권한과 동일하게 API에서 강제
router.get('/boards', requireMenuPermission(MENU_WORK_PROJECTS, 'can_view'), getWorkBoards);
router.post(
  '/boards',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_PROJECTS, 'can_create'),
  createWorkBoard
);
router.get('/boards/:boardId', requireMenuPermission(MENU_WORK_PROJECTS, 'can_view'), getWorkBoardDetail);
router.put(
  '/boards/:boardId',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_PROJECTS, 'can_edit'),
  updateWorkBoard
);
router.delete(
  '/boards/:boardId',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_PROJECTS, 'can_delete'),
  deleteWorkBoard
);
router.post(
  '/boards/:boardId/move',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_PROJECTS, 'can_edit'),
  moveWorkBoard
);
router.post(
  '/boards/:boardId/lists',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_PROJECTS, 'can_create'),
  createWorkBoardList
);
router.put(
  '/boards/:boardId/lists/:listId',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_PROJECTS, 'can_edit'),
  updateWorkBoardList
);
router.post(
  '/boards/:boardId/lists/:listId/move',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_PROJECTS, 'can_edit'),
  moveWorkBoardList
);
router.delete(
  '/boards/:boardId/lists/:listId',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_PROJECTS, 'can_delete'),
  deleteWorkBoardList
);
router.post(
  '/boards/:boardId/lists/:listId/cards',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_PROJECTS, 'can_create'),
  createWorkBoardCard
);
router.put(
  '/boards/:boardId/cards/:cardId',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_PROJECTS, 'can_edit'),
  updateWorkBoardCard
);
router.post(
  '/boards/:boardId/cards/:cardId/move',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_PROJECTS, 'can_edit'),
  moveWorkBoardCard
);
router.delete(
  '/boards/:boardId/cards/:cardId',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_PROJECTS, 'can_delete'),
  deleteWorkBoardCard
);
router.get(
  '/boards/:boardId/cards/:cardId/comments',
  requireMenuPermission(MENU_WORK_PROJECTS, 'can_view'),
  getWorkBoardCardComments
);
router.post(
  '/boards/:boardId/cards/:cardId/comments',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_PROJECTS, 'can_edit'),
  createWorkBoardCardComment
);
router.delete(
  '/boards/:boardId/cards/:cardId/comments/:commentId',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_PROJECTS, 'can_edit'),
  deleteWorkBoardCardComment
);
router.get('/boards/:boardId/members', requireMenuPermission(MENU_WORK_PROJECTS, 'can_view'), getWorkBoardMembers);
router.post(
  '/boards/:boardId/members',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_PROJECTS, 'can_edit'),
  inviteWorkBoardMember
);
router.put(
  '/boards/:boardId/members/:userId',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_PROJECTS, 'can_edit'),
  updateWorkBoardMember
);
router.delete(
  '/boards/:boardId/members/:userId',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_PROJECTS, 'can_edit'),
  removeWorkBoardMember
);

// 첨부 파일 업로드 설정
const uploadPath = ensureUploadRoot();
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];
const ensureUploadDir = () => {
  ensureUploadRoot();
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDir();
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    let finalName = safeName;
    let counter = 1;
    while (fs.existsSync(path.join(uploadPath, finalName))) {
      const extIndex = safeName.lastIndexOf('.');
      const base = extIndex > -1 ? safeName.slice(0, extIndex) : safeName;
      const ext = extIndex > -1 ? safeName.slice(extIndex) : '';
      finalName = `${base}_${counter}${ext}`;
      counter += 1;
    }
    cb(null, finalName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('허용되지 않은 파일 형식입니다.'));
    }
    if (!allowedExtensions.includes(extension)) {
      return cb(new Error('허용되지 않은 파일 확장자입니다.'));
    }
    return cb(null, true);
  }
});

// 업무 통계 관련 라우트
router.get('/statistics', requireMenuPermission(MENU_WORK_STATISTICS, 'can_view'), getWorkStatistics);
router.get('/statistics/:id', requireMenuPermission(MENU_WORK_STATISTICS, 'can_view'), getWorkStatistic);
router.post(
  '/statistics',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_STATISTICS, 'can_create'),
  createWorkStatistic
);
router.put(
  '/statistics/:id',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_STATISTICS, 'can_edit'),
  updateWorkStatistic
);
router.delete(
  '/statistics/:id',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_STATISTICS, 'can_delete'),
  deleteWorkStatistic
);

// 전자 결제 관련 라우트
router.get('/approvals/types', requireMenuPermission(MENU_WORK_APPROVAL, 'can_view'), getApprovalTypes);
router.post(
  '/approvals/types',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_APPROVAL, 'can_create'),
  createApprovalType
);
router.put(
  '/approvals/types/:id',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_APPROVAL, 'can_edit'),
  updateApprovalType
);
router.delete(
  '/approvals/types/:id',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_APPROVAL, 'can_delete'),
  deleteApprovalType
);
router.get('/approvals', requireMenuPermission(MENU_WORK_APPROVAL, 'can_view'), getApprovals);
router.get('/approvals/:id', requireMenuPermission(MENU_WORK_APPROVAL, 'can_view'), getApproval);
router.post(
  '/approvals/upload',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_APPROVAL, 'can_edit'),
  upload.array('files'),
  (req, res) => {
    const files = (req.files || []) as Express.Multer.File[];
    const result = files.map((file) => ({
      originalName: file.originalname,
      storedName: file.filename
    }));
    res.json({ success: true, data: { files: result } });
  }
);
router.post(
  '/approvals',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_APPROVAL, 'can_create'),
  createApproval
);
router.put(
  '/approvals/:id',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_APPROVAL, 'can_edit'),
  updateApproval
);
router.delete(
  '/approvals/:id',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_APPROVAL, 'can_delete'),
  deleteApproval
);
router.post(
  '/approvals/:id/submit',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_APPROVAL, 'can_edit'),
  submitApproval
);
router.post(
  '/approvals/:id/approve',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_APPROVAL, 'can_edit'),
  approveApproval
);
router.post(
  '/approvals/:id/reject',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_APPROVAL, 'can_edit'),
  rejectApproval
);
router.post(
  '/approvals/:id/escalate',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_APPROVAL, 'can_edit'),
  escalateApproval
);
router.post(
  '/approvals/:id/comments',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_APPROVAL, 'can_edit'),
  addComment
);

// 회의실 예약 관련 라우트
router.get('/room-bookings', requireMenuPermissionAny(MENU_ROOM_RESERVATION_ROUTES, 'can_view'), getRoomBookings);
router.get('/room-bookings/:id', requireMenuPermissionAny(MENU_ROOM_RESERVATION_ROUTES, 'can_view'), getRoomBooking);
router.post(
  '/room-bookings',
  restrictAuditToReadOnly,
  requireMenuPermissionAny(MENU_ROOM_RESERVATION_ROUTES, 'can_create'),
  createRoomBooking
);
router.put(
  '/room-bookings/:id',
  restrictAuditToReadOnly,
  requireMenuPermissionAny(MENU_ROOM_RESERVATION_ROUTES, 'can_edit'),
  updateRoomBooking
);
router.delete(
  '/room-bookings/:id',
  restrictAuditToReadOnly,
  requireMenuPermissionAny(MENU_ROOM_RESERVATION_ROUTES, 'can_delete'),
  deleteRoomBooking
);
router.post(
  '/room-bookings/:id/confirm',
  restrictAuditToReadOnly,
  requireMenuPermissionAny(MENU_ROOM_RESERVATION_ROUTES, 'can_edit'),
  confirmRoomBooking
);
router.post(
  '/room-bookings/:id/cancel',
  restrictAuditToReadOnly,
  requireMenuPermissionAny(MENU_ROOM_RESERVATION_ROUTES, 'can_edit'),
  cancelRoomBooking
);

// 객실 유형 관련 라우트
router.get('/room-types', requireMenuPermissionAny(MENU_ROOM_RESERVATION_ROUTES, 'can_view'), getRoomTypes);
router.post(
  '/room-types',
  restrictAuditToReadOnly,
  requireMenuPermissionAny(MENU_ROOM_RESERVATION_ROUTES, 'can_create'),
  createRoomType
);
router.put(
  '/room-types/:id',
  restrictAuditToReadOnly,
  requireMenuPermissionAny(MENU_ROOM_RESERVATION_ROUTES, 'can_edit'),
  updateRoomType
);
router.delete(
  '/room-types/:id',
  restrictAuditToReadOnly,
  requireMenuPermissionAny(MENU_ROOM_RESERVATION_ROUTES, 'can_delete'),
  deleteRoomType
);

// 객실 호실명 관련 라우트
router.get('/room-type-rooms', requireMenuPermissionAny(MENU_ROOM_RESERVATION_ROUTES, 'can_view'), getRoomTypeRooms);
router.put(
  '/room-type-rooms',
  restrictAuditToReadOnly,
  requireMenuPermissionAny(MENU_ROOM_RESERVATION_ROUTES, 'can_edit'),
  upsertRoomTypeRoom
);

// 업무 담당 리스트 (엑셀형 담당자 컬럼 + 담당 회사)
router.get('/assignee-list', requireMenuPermission(MENU_WORK_ASSIGNEE_LIST, 'can_view'), getWorkAssigneeList);
router.post(
  '/assignee-list/assignees',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_ASSIGNEE_LIST, 'can_create'),
  createWorkAssignee
);
router.put(
  '/assignee-list/assignees/:id',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_ASSIGNEE_LIST, 'can_edit'),
  updateWorkAssignee
);
router.delete(
  '/assignee-list/assignees/:id',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_ASSIGNEE_LIST, 'can_delete'),
  deleteWorkAssignee
);
router.post(
  '/assignee-list/assignees/:id/move',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_ASSIGNEE_LIST, 'can_edit'),
  moveWorkAssignee
);
router.post(
  '/assignee-list/assignees/:assigneeId/items',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_ASSIGNEE_LIST, 'can_create'),
  createWorkAssigneeItem
);
router.put(
  '/assignee-list/items/:id',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_ASSIGNEE_LIST, 'can_edit'),
  updateWorkAssigneeItem
);
router.delete(
  '/assignee-list/items/:id',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_ASSIGNEE_LIST, 'can_delete'),
  deleteWorkAssigneeItem
);
router.post(
  '/assignee-list/items/:id/move',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_ASSIGNEE_LIST, 'can_edit'),
  moveWorkAssigneeItem
);

// 업무 보고서 관련 라우트
router.get('/reports', requireMenuPermission(MENU_WORK_REPORTS, 'can_view'), getWorkReports);
router.get('/reports/:id', requireMenuPermission(MENU_WORK_REPORTS, 'can_view'), getWorkReport);
router.post(
  '/reports',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_REPORTS, 'can_create'),
  createWorkReport
);
router.put(
  '/reports/:id',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_REPORTS, 'can_edit'),
  updateWorkReport
);
router.delete(
  '/reports/:id',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_REPORTS, 'can_delete'),
  deleteWorkReport
);
router.post(
  '/reports/:id/submit',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_REPORTS, 'can_edit'),
  submitWorkReport
);
router.post(
  '/reports/:id/review',
  restrictAuditToReadOnly,
  requireMenuPermission(MENU_WORK_REPORTS, 'can_edit'),
  reviewWorkReport
);

export default router;


