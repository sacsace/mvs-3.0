import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
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
import { authenticateToken, restrictAuditToReadOnly } from '../middleware/auth';

const router = Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

// 작업 보드 (칸반 / 트렐로형)
router.get('/boards', getWorkBoards);
router.post('/boards', restrictAuditToReadOnly, createWorkBoard);
router.get('/boards/:boardId', getWorkBoardDetail);
router.put('/boards/:boardId', restrictAuditToReadOnly, updateWorkBoard);
router.delete('/boards/:boardId', restrictAuditToReadOnly, deleteWorkBoard);
router.post('/boards/:boardId/lists', restrictAuditToReadOnly, createWorkBoardList);
router.put('/boards/:boardId/lists/:listId', restrictAuditToReadOnly, updateWorkBoardList);
router.post('/boards/:boardId/lists/:listId/move', restrictAuditToReadOnly, moveWorkBoardList);
router.delete('/boards/:boardId/lists/:listId', restrictAuditToReadOnly, deleteWorkBoardList);
router.post('/boards/:boardId/lists/:listId/cards', restrictAuditToReadOnly, createWorkBoardCard);
router.put('/boards/:boardId/cards/:cardId', restrictAuditToReadOnly, updateWorkBoardCard);
router.post('/boards/:boardId/cards/:cardId/move', restrictAuditToReadOnly, moveWorkBoardCard);
router.delete('/boards/:boardId/cards/:cardId', restrictAuditToReadOnly, deleteWorkBoardCard);
router.get('/boards/:boardId/cards/:cardId/comments', getWorkBoardCardComments);
router.post('/boards/:boardId/cards/:cardId/comments', restrictAuditToReadOnly, createWorkBoardCardComment);
router.delete('/boards/:boardId/cards/:cardId/comments/:commentId', restrictAuditToReadOnly, deleteWorkBoardCardComment);
router.get('/boards/:boardId/members', getWorkBoardMembers);
router.post('/boards/:boardId/members', restrictAuditToReadOnly, inviteWorkBoardMember);
router.put('/boards/:boardId/members/:userId', restrictAuditToReadOnly, updateWorkBoardMember);
router.delete('/boards/:boardId/members/:userId', restrictAuditToReadOnly, removeWorkBoardMember);

// 첨부 파일 업로드 설정
const uploadPath = process.env.UPLOAD_PATH || './uploads';
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
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
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
router.get('/statistics', getWorkStatistics);
router.get('/statistics/:id', getWorkStatistic);
router.post('/statistics', restrictAuditToReadOnly, createWorkStatistic);
router.put('/statistics/:id', restrictAuditToReadOnly, updateWorkStatistic);
router.delete('/statistics/:id', restrictAuditToReadOnly, deleteWorkStatistic);

// 전자 결제 관련 라우트
router.get('/approvals', getApprovals);
router.get('/approvals/:id', getApproval);
router.post('/approvals/upload', restrictAuditToReadOnly, upload.array('files'), (req, res) => {
  const files = (req.files || []) as Express.Multer.File[];
  const result = files.map((file) => ({
    originalName: file.originalname,
    storedName: file.filename
  }));
  res.json({ success: true, data: { files: result } });
});
router.post('/approvals', restrictAuditToReadOnly, createApproval);
router.put('/approvals/:id', restrictAuditToReadOnly, updateApproval);
router.delete('/approvals/:id', restrictAuditToReadOnly, deleteApproval);
router.post('/approvals/:id/submit', restrictAuditToReadOnly, submitApproval);
router.post('/approvals/:id/approve', restrictAuditToReadOnly, approveApproval);
router.post('/approvals/:id/reject', restrictAuditToReadOnly, rejectApproval);
router.post('/approvals/:id/escalate', restrictAuditToReadOnly, escalateApproval);
router.post('/approvals/:id/comments', addComment);

// 회의실 예약 관련 라우트
router.get('/room-bookings', getRoomBookings);
router.get('/room-bookings/:id', getRoomBooking);
router.post('/room-bookings', restrictAuditToReadOnly, createRoomBooking);
router.put('/room-bookings/:id', restrictAuditToReadOnly, updateRoomBooking);
router.delete('/room-bookings/:id', restrictAuditToReadOnly, deleteRoomBooking);
router.post('/room-bookings/:id/confirm', restrictAuditToReadOnly, confirmRoomBooking);
router.post('/room-bookings/:id/cancel', restrictAuditToReadOnly, cancelRoomBooking);

// 객실 유형 관련 라우트
router.get('/room-types', getRoomTypes);
router.post('/room-types', restrictAuditToReadOnly, createRoomType);
router.put('/room-types/:id', restrictAuditToReadOnly, updateRoomType);
router.delete('/room-types/:id', restrictAuditToReadOnly, deleteRoomType);

// 객실 호실명 관련 라우트
router.get('/room-type-rooms', getRoomTypeRooms);
router.put('/room-type-rooms', restrictAuditToReadOnly, upsertRoomTypeRoom);

// 업무 보고서 관련 라우트
router.get('/reports', getWorkReports);
router.get('/reports/:id', getWorkReport);
router.post('/reports', restrictAuditToReadOnly, createWorkReport);
router.put('/reports/:id', restrictAuditToReadOnly, updateWorkReport);
router.delete('/reports/:id', restrictAuditToReadOnly, deleteWorkReport);
router.post('/reports/:id/submit', restrictAuditToReadOnly, submitWorkReport);
router.post('/reports/:id/review', restrictAuditToReadOnly, reviewWorkReport);

export default router;


