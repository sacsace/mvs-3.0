import { Response } from 'express';
import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/database';
import SocketService from '../services/socketService';
import { pushNotification } from './notificationController';
import { RequestWithUser } from '../types';
import {
  WorkBoard,
  WorkBoardList,
  WorkBoardCard,
  WorkBoardCardComment,
  WorkBoardMember,
  User
} from '../models';

const DEFAULT_LISTS = [
  { title: '할 일', position: 0 },
  { title: '진행 중', position: 1 },
  { title: '완료', position: 2 }
];

let workBoardSchemaEnsured = false;
let workBoardListSchemaEnsured = false;
let workBoardCardSchemaEnsured = false;
let workBoardCardCommentSchemaEnsured = false;

const isDuplicateColumnError = (error: unknown): boolean => {
  const err = error as { parent?: { code?: string }; original?: { code?: string }; message?: string };
  const code = err?.parent?.code || err?.original?.code;
  if (code === '42701') return true;
  const message = String(err?.message || '').toLowerCase();
  return message.includes('already exists') || message.includes('이미 있습니다');
};

const tableColumnExists = async (tableName: string, columnName: string): Promise<boolean> => {
  const [rows] = await sequelize.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = CURRENT_SCHEMA()
       AND table_name = :tableName
       AND column_name = :columnName
     LIMIT 1`,
    { replacements: { tableName, columnName } }
  );
  return Array.isArray(rows) && rows.length > 0;
};

const ensureWorkBoardSchema = async () => {
  if (workBoardSchemaEnsured) return;
  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable('work_boards');
  if (!table.board_color) {
    await queryInterface.addColumn('work_boards', 'board_color', {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: null
    });
  }
  if (!table.position) {
    await queryInterface.addColumn('work_boards', 'position', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  }
  workBoardSchemaEnsured = true;
};

const ensureWorkBoardListSchema = async () => {
  if (workBoardListSchemaEnsured) return;
  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable('work_board_lists');
  if (!table.description) {
    await queryInterface.addColumn('work_board_lists', 'description', {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null
    });
  }
  workBoardListSchemaEnsured = true;
};

const ensureWorkBoardCardSchema = async () => {
  if (workBoardCardSchemaEnsured) return;
  const queryInterface = sequelize.getQueryInterface();

  if (!(await tableColumnExists('work_board_cards', 'reference_user_ids'))) {
    try {
      await queryInterface.addColumn('work_board_cards', 'reference_user_ids', {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
      });
    } catch (error) {
      if (!isDuplicateColumnError(error)) throw error;
    }
  }

  if (!(await tableColumnExists('work_board_cards', 'completed_at'))) {
    try {
      await queryInterface.addColumn('work_board_cards', 'completed_at', {
        type: DataTypes.DATE,
        allowNull: true
      });
    } catch (error) {
      if (!isDuplicateColumnError(error)) throw error;
    }
  }

  workBoardCardSchemaEnsured = true;
};

const ensureWorkBoardCardCommentSchema = async () => {
  if (workBoardCardCommentSchemaEnsured) return;
  try {
    const queryInterface = sequelize.getQueryInterface();
    const table = await queryInterface.describeTable('work_board_card_comments');
    if (!table.parent_id) {
      await queryInterface.addColumn('work_board_card_comments', 'parent_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'work_board_card_comments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
      await queryInterface.addIndex('work_board_card_comments', ['parent_id'], {
        name: 'work_board_card_comments_parent_id_idx'
      });
    }
    workBoardCardCommentSchemaEnsured = true;
  } catch (e) {
    console.warn('ensureWorkBoardCardCommentSchema:', e);
  }
};

const isMissingCommentsTableError = (error: unknown): boolean => {
  const msg = String((error as any)?.message || '').toLowerCase();
  return (
    msg.includes('work_board_card_comments') &&
    (msg.includes('does not exist') || msg.includes('relation') || msg.includes('존재'))
  );
};

const buildCardNestedInclude = (light: boolean) => {
  const includes: any[] = [
    { model: User, as: 'assignee', attributes: ['id', 'username', 'userid', 'email'] },
    { model: User, as: 'cardCreator', attributes: ['id', 'username'] }
  ];
  if (light) {
    includes.push({
      model: WorkBoardCardComment,
      as: 'comments',
      attributes: ['id'],
      separate: true
    });
  } else {
    includes.push({
      model: WorkBoardCardComment,
      as: 'comments',
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'userid', 'email'] }],
      separate: true,
      order: [['created_at', 'ASC']]
    });
  }
  return includes;
};

const buildBoardDetailInclude = (light: boolean): any[] => [
  {
    model: WorkBoardList,
    as: 'lists',
    include: [
      {
        model: WorkBoardCard,
        as: 'cards',
        include: buildCardNestedInclude(light),
        separate: true,
        order: [
          ['position', 'ASC'],
          ['id', 'ASC']
        ]
      }
    ],
    order: [
      ['position', 'ASC'],
      ['id', 'ASC']
    ]
  },
  {
    model: WorkBoardMember,
    as: 'members',
    include: [{ model: User, as: 'user', attributes: ['id', 'username', 'userid', 'email', 'department', 'position'] }]
  },
  { model: User, as: 'creator', attributes: ['id', 'username', 'userid'] }
];

const normalizeCardColor = (
  value: unknown
): { valid: boolean; value: string | null | undefined } => {
  if (value === undefined) return { valid: true, value: undefined };
  if (value === null || value === '') return { valid: true, value: null };
  const color = String(value).trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(color)) {
    return { valid: true, value: color };
  }
  return { valid: false, value: undefined };
};

const normalizeBoardColor = (
  value: unknown
): { valid: boolean; value: string | null | undefined } => {
  if (value === undefined) return { valid: true, value: undefined };
  if (value === null || value === '') return { valid: true, value: null };
  const color = String(value).trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(color)) {
    return { valid: true, value: color };
  }
  return { valid: false, value: undefined };
};

const parseReferenceUserIds = (value: unknown): { valid: boolean; value: number[] | undefined } => {
  if (value === undefined) return { valid: true, value: undefined };
  if (value === null || value === '') return { valid: true, value: [] };
  if (!Array.isArray(value)) return { valid: false, value: undefined };
  const numbers = value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
  const unique = Array.from(new Set(numbers));
  return { valid: true, value: unique };
};

const normalizeCardDescription = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return String(value);
};

const COMPLETED_LIST_KEYWORDS = ['완료', '종료', 'done', 'completed', 'closed'];

const isCompletedListTitle = (title?: string): boolean => {
  const normalized = String(title || '').trim().toLowerCase();
  if (!normalized) return false;
  return COMPLETED_LIST_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

/** 프론트 WorkBoardDetailPage 의 resolveCompletedList 와 동일 규칙 */
const resolveCompletedListId = (lists: { id: number; title: string; position: number }[]): number | null => {
  const sorted = [...lists].sort((a, b) => a.position - b.position);
  const byTitle = sorted.find((l) => isCompletedListTitle(l.title));
  if (byTitle) return byTitle.id;
  if (sorted.length >= 2) return sorted[sorted.length - 1].id;
  return null;
};

const sendCardAssignmentNotification = (
  req: RequestWithUser,
  payload: {
    targetUserId: number;
    boardId: number;
    boardName: string;
    cardId: number;
    cardTitle: string;
    actorName: string;
  }
) => {
  const socketService = (req as any).socketService as SocketService | undefined;
  pushNotification(
    {
      title: '업무 담당자 지정',
      message: `${payload.actorName}님이 "${payload.cardTitle}" 카드의 담당자로 지정했습니다.`,
      type: 'info',
      target_type: 'user',
      target_id: payload.targetUserId,
      data: {
        feature: 'work_board',
        board_id: payload.boardId,
        board_name: payload.boardName,
        card_id: payload.cardId,
        card_title: payload.cardTitle
      },
      tenant_id: req.user?.tenant_id,
      company_id: req.user?.company_id,
      sender_user_id: req.user?.id
    },
    socketService
  );
};

async function userCanAccessBoard(
  user: RequestWithUser['user'],
  board: WorkBoard,
  isMember: boolean,
  forWrite = false
): Promise<boolean> {
  if (user.role === 'root') {
    return board.tenant_id === user.tenant_id;
  }
  if (user.role === 'audit') {
    if (board.tenant_id !== user.tenant_id) return false;
    if (forWrite) {
      return board.company_id === user.company_id;
    }
    return true;
  }
  return (
    board.tenant_id === user.tenant_id &&
    board.company_id === user.company_id &&
    isMember
  );
}

async function findBoardForUser(
  boardId: number,
  user: RequestWithUser['user'],
  forWrite = false
) {
  await ensureWorkBoardSchema();
  await ensureWorkBoardCardSchema();
  await ensureWorkBoardCardCommentSchema();
  const board = await WorkBoard.findByPk(boardId);
  if (!board) return { board: null, member: null };
  const member = await WorkBoardMember.findOne({
    where: { board_id: boardId, user_id: user.id }
  });
  const can = await userCanAccessBoard(user, board, !!member, forWrite);
  if (!can) return { board: null, member: null };
  return { board, member };
}

export const getWorkBoards = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureWorkBoardSchema();
    const user = req.user!;
    const { company_id } = req.query;

    let boards: WorkBoard[];

    if (user.role === 'root' || user.role === 'audit') {
      const where: any = { tenant_id: user.tenant_id };
      if (user.role === 'root' && company_id) {
        where.company_id = parseInt(company_id as string, 10);
      }
      boards = await WorkBoard.findAll({
        where,
        include: [
          { model: User, as: 'creator', attributes: ['id', 'username', 'userid'] },
          {
            model: WorkBoardMember,
            as: 'members',
            include: [{ model: User, as: 'user', attributes: ['id', 'username', 'userid', 'email'] }]
          }
        ],
        order: [
          ['position', 'ASC'],
          ['id', 'ASC']
        ]
      });
    } else {
      const myMemberships = await WorkBoardMember.findAll({
        where: { user_id: user.id },
        attributes: ['board_id']
      });
      const boardIds = myMemberships.map((m) => m.board_id);
      if (boardIds.length === 0) {
        boards = [];
      } else {
        boards = await WorkBoard.findAll({
          where: {
            id: { [Op.in]: boardIds },
            tenant_id: user.tenant_id,
            company_id: user.company_id
          },
          include: [
            { model: User, as: 'creator', attributes: ['id', 'username', 'userid'] },
            {
              model: WorkBoardMember,
              as: 'members',
              include: [{ model: User, as: 'user', attributes: ['id', 'username', 'userid', 'email'] }]
            }
          ],
          order: [
            ['position', 'ASC'],
            ['id', 'ASC']
          ]
        });
      }
    }

    res.json({ success: true, data: boards });
  } catch (error: any) {
    console.error('getWorkBoards:', error);
    res.status(500).json({
      success: false,
      message: '작업 보드 목록을 불러오지 못했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const createWorkBoard = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureWorkBoardSchema();
    await ensureWorkBoardCardSchema();
    const user = req.user!;
    const { name, description, board_color } = req.body;
    if (!name || String(name).trim().length === 0) {
      return res.status(400).json({ success: false, message: '보드 이름이 필요합니다.' });
    }

    const parsedBoardColor = normalizeBoardColor(board_color);
    if (!parsedBoardColor.valid) {
      return res.status(400).json({ success: false, message: '보드 색상 형식이 올바르지 않습니다.' });
    }

    const board = await sequelize.transaction(async (t) => {
      await WorkBoard.increment('position', {
        by: 1,
        where: { tenant_id: user.tenant_id, company_id: user.company_id },
        transaction: t
      });
      const b = await WorkBoard.create(
        {
          tenant_id: user.tenant_id,
          company_id: user.company_id,
          name: String(name).trim().slice(0, 200),
          description: description ? String(description).slice(0, 5000) : undefined,
          board_color: parsedBoardColor.value ?? null,
          position: 0,
          created_by: user.id
        },
        { transaction: t }
      );

      for (const dl of DEFAULT_LISTS) {
        await WorkBoardList.create(
          { board_id: b.id, title: dl.title, position: dl.position },
          { transaction: t }
        );
      }

      await WorkBoardMember.create(
        {
          board_id: b.id,
          user_id: user.id,
          role: 'owner',
          invited_by: null
        },
        { transaction: t }
      );

      return b;
    });

    const full = await WorkBoard.findByPk(board.id, {
      include: [
        { model: WorkBoardList, as: 'lists', include: [{ model: WorkBoardCard, as: 'cards' }] },
        {
          model: WorkBoardMember,
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'username', 'userid', 'email'] }]
        }
      ]
    });

    res.status(201).json({ success: true, data: full });
  } catch (error: any) {
    console.error('createWorkBoard:', error);
    res.status(500).json({
      success: false,
      message: '작업 보드를 만들지 못했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getWorkBoardDetail = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureWorkBoardSchema();
    await ensureWorkBoardListSchema();
    const user = req.user!;
    const boardId = parseInt(req.params.boardId, 10);
    const { board, member } = await findBoardForUser(boardId, user);

    if (!board) {
      return res.status(404).json({ success: false, message: '보드를 찾을 수 없거나 접근 권한이 없습니다.' });
    }

    if (user.role !== 'root' && user.role !== 'audit' && !member) {
      return res.status(403).json({ success: false, message: '이 보드의 멤버만 볼 수 있습니다.' });
    }

    const light = String(req.query.light || '') === '1';

    let full: any;
    try {
      full = await WorkBoard.findByPk(board.id, {
        include: buildBoardDetailInclude(light)
      });
    } catch (error: any) {
      if (!isMissingCommentsTableError(error)) {
        throw error;
      }
      // 댓글 테이블 미적용 환경에서도 보드 자체는 조회 가능하도록 폴백
      full = await WorkBoard.findByPk(board.id, {
        include: buildBoardDetailInclude(true)
      });
    }

    res.json({ success: true, data: full });
  } catch (error: any) {
    console.error('getWorkBoardDetail:', error);
    res.status(500).json({
      success: false,
      message: '보드 정보를 불러오지 못했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const updateWorkBoard = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureWorkBoardSchema();
    const user = req.user!;
    const boardId = parseInt(req.params.boardId, 10);
    const { board, member } = await findBoardForUser(boardId, user, true);
    if (!board || (!member && user.role !== 'root')) {
      return res.status(404).json({ success: false, message: '보드를 찾을 수 없거나 권한이 없습니다.' });
    }
    if (member && member.role !== 'owner' && user.role !== 'root') {
      return res.status(403).json({ success: false, message: '보드 소유자만 수정할 수 있습니다.' });
    }

    const { name, description, board_color } = req.body;
    const patch: any = {};
    if (name !== undefined) patch.name = String(name).trim().slice(0, 200);
    if (description !== undefined) patch.description = description ? String(description).slice(0, 5000) : null;
    if (board_color !== undefined) {
      const parsedBoardColor = normalizeBoardColor(board_color);
      if (!parsedBoardColor.valid) {
        return res.status(400).json({ success: false, message: '보드 색상 형식이 올바르지 않습니다.' });
      }
      patch.board_color = parsedBoardColor.value ?? null;
    }

    await board.update(patch);
    await board.reload();
    res.json({ success: true, data: board });
  } catch (error: any) {
    console.error('updateWorkBoard:', error);
    res.status(500).json({ success: false, message: '수정에 실패했습니다.' });
  }
};

export const deleteWorkBoard = async (req: RequestWithUser, res: Response) => {
  try {
    const user = req.user!;
    const boardId = parseInt(req.params.boardId, 10);
    const { board, member } = await findBoardForUser(boardId, user, true);
    if (!board || !member) {
      return res.status(404).json({ success: false, message: '보드를 찾을 수 없거나 권한이 없습니다.' });
    }
    if (member.role !== 'owner') {
      return res.status(403).json({ success: false, message: '보드 소유자만 삭제할 수 있습니다.' });
    }

    const tenantId = board.tenant_id;
    const companyId = board.company_id;

    await sequelize.transaction(async (t) => {
      const lists = await WorkBoardList.findAll({ where: { board_id: board.id }, transaction: t });
      const listIds = lists.map((l) => l.id);
      if (listIds.length) {
        await WorkBoardCard.destroy({ where: { list_id: { [Op.in]: listIds } }, transaction: t });
      }
      await WorkBoardList.destroy({ where: { board_id: board.id }, transaction: t });
      await WorkBoardMember.destroy({ where: { board_id: board.id }, transaction: t });
      await board.destroy({ transaction: t });

      const remaining = await WorkBoard.findAll({
        where: { tenant_id: tenantId, company_id: companyId },
        order: [
          ['position', 'ASC'],
          ['id', 'ASC']
        ],
        transaction: t
      });
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].position !== i) {
          await remaining[i].update({ position: i }, { transaction: t });
        }
      }
    });

    res.json({ success: true, message: '삭제되었습니다.' });
  } catch (error: any) {
    console.error('deleteWorkBoard:', error);
    res.status(500).json({ success: false, message: '삭제에 실패했습니다.' });
  }
};

export const createWorkBoardList = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureWorkBoardListSchema();
    const user = req.user!;
    const boardId = parseInt(req.params.boardId, 10);
    const { board, member } = await findBoardForUser(boardId, user, true);
    if (!board || (!member && user.role !== 'root')) {
      return res.status(404).json({ success: false, message: '권한이 없습니다.' });
    }

    const { title, description } = req.body;
    if (!title || String(title).trim().length === 0) {
      return res.status(400).json({ success: false, message: '목록 이름이 필요합니다.' });
    }

    const max = await WorkBoardList.max('position', { where: { board_id: board.id } });
    const position = max !== null && (max as number) >= 0 ? (max as number) + 1 : 0;
    const normalizedDescription =
      description === undefined || description === null
        ? null
        : String(description).trim().slice(0, 500) || null;

    const list = await WorkBoardList.create({
      board_id: board.id,
      title: String(title).trim().slice(0, 120),
      description: normalizedDescription,
      position
    });

    res.status(201).json({ success: true, data: list });
  } catch (error: any) {
    console.error('createWorkBoardList:', error);
    res.status(500).json({ success: false, message: '목록 생성에 실패했습니다.' });
  }
};

export const updateWorkBoardList = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureWorkBoardListSchema();
    const user = req.user!;
    const boardId = parseInt(req.params.boardId, 10);
    const listId = parseInt(req.params.listId, 10);
    const { board, member } = await findBoardForUser(boardId, user, true);
    if (!board || (!member && user.role !== 'root')) {
      return res.status(404).json({ success: false, message: '권한이 없습니다.' });
    }

    const list = await WorkBoardList.findOne({ where: { id: listId, board_id: board.id } });
    if (!list) {
      return res.status(404).json({ success: false, message: '목록을 찾을 수 없습니다.' });
    }

    const { title, description } = req.body;
    if (title !== undefined) {
      const normalized = String(title).trim();
      if (normalized.length === 0) {
        return res.status(400).json({ success: false, message: '목록 이름이 필요합니다.' });
      }
      list.title = normalized.slice(0, 120);
    }
    if (description !== undefined) {
      list.description =
        description === null || String(description).trim() === ''
          ? null
          : String(description).trim().slice(0, 500);
    }
    if (title !== undefined || description !== undefined) {
      await list.save();
    }

    return res.json({ success: true, data: list });
  } catch (error: any) {
    console.error('updateWorkBoardList:', error);
    return res.status(500).json({ success: false, message: '목록 수정에 실패했습니다.' });
  }
};

export const moveWorkBoardList = async (req: RequestWithUser, res: Response) => {
  try {
    const user = req.user!;
    const boardId = parseInt(req.params.boardId, 10);
    const listId = parseInt(req.params.listId, 10);
    const { index } = req.body;

    if (index === undefined || index < 0) {
      return res.status(400).json({ success: false, message: 'index(0부터)가 필요합니다.' });
    }

    const { board, member } = await findBoardForUser(boardId, user, true);
    if (!board || (!member && user.role !== 'root')) {
      return res.status(404).json({ success: false, message: '권한이 없습니다.' });
    }

    await sequelize.transaction(async (transaction) => {
      const target = await WorkBoardList.findOne({
        where: { id: listId, board_id: board.id },
        transaction
      });
      if (!target) {
        throw new Error('LIST_NOT_FOUND');
      }

      const others = await WorkBoardList.findAll({
        where: { board_id: board.id, id: { [Op.ne]: listId } },
        order: [
          ['position', 'ASC'],
          ['id', 'ASC']
        ],
        transaction
      });

      const orderedIds = others.map((l) => l.id);
      const insertAt = Math.min(parseInt(String(index), 10), orderedIds.length);
      orderedIds.splice(insertAt, 0, listId);

      for (let i = 0; i < orderedIds.length; i++) {
        await WorkBoardList.update(
          { position: i },
          { where: { id: orderedIds[i] }, transaction }
        );
      }
    });

    return res.json({ success: true, message: '목록이 이동되었습니다.' });
  } catch (error: any) {
    if (error?.message === 'LIST_NOT_FOUND') {
      return res.status(404).json({ success: false, message: '목록을 찾을 수 없습니다.' });
    }
    console.error('moveWorkBoardList:', error);
    return res.status(500).json({ success: false, message: '목록 이동에 실패했습니다.' });
  }
};

export const moveWorkBoard = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureWorkBoardSchema();
    const user = req.user!;
    const boardId = parseInt(req.params.boardId, 10);
    const { index } = req.body;

    if (index === undefined || index < 0) {
      return res.status(400).json({ success: false, message: 'index(0부터)가 필요합니다.' });
    }

    const { board, member } = await findBoardForUser(boardId, user, true);
    if (!board || (!member && user.role !== 'root')) {
      return res.status(404).json({ success: false, message: '권한이 없습니다.' });
    }

    await sequelize.transaction(async (transaction) => {
      const others = await WorkBoard.findAll({
        where: {
          tenant_id: board.tenant_id,
          company_id: board.company_id,
          id: { [Op.ne]: boardId }
        },
        order: [
          ['position', 'ASC'],
          ['id', 'ASC']
        ],
        transaction
      });

      const orderedIds = others.map((b) => b.id);
      const insertAt = Math.min(parseInt(String(index), 10), orderedIds.length);
      orderedIds.splice(insertAt, 0, boardId);

      for (let i = 0; i < orderedIds.length; i++) {
        await WorkBoard.update({ position: i }, { where: { id: orderedIds[i] }, transaction });
      }
    });

    return res.json({ success: true, message: '보드 순서가 변경되었습니다.' });
  } catch (error: any) {
    console.error('moveWorkBoard:', error);
    return res.status(500).json({ success: false, message: '보드 이동에 실패했습니다.' });
  }
};

export const deleteWorkBoardList = async (req: RequestWithUser, res: Response) => {
  try {
    const user = req.user!;
    const boardId = parseInt(req.params.boardId, 10);
    const listId = parseInt(req.params.listId, 10);
    const { board, member } = await findBoardForUser(boardId, user, true);
    if (!board || (!member && user.role !== 'root')) {
      return res.status(404).json({ success: false, message: '권한이 없습니다.' });
    }

    const list = await WorkBoardList.findOne({ where: { id: listId, board_id: board.id } });
    if (!list) {
      return res.status(404).json({ success: false, message: '목록을 찾을 수 없습니다.' });
    }

    await sequelize.transaction(async (transaction) => {
      await WorkBoardCard.destroy({
        where: { list_id: list.id },
        transaction
      });
      await list.destroy({ transaction });

      const remaining = await WorkBoardList.findAll({
        where: { board_id: board.id },
        order: [
          ['position', 'ASC'],
          ['id', 'ASC']
        ],
        transaction
      });
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].position !== i) {
          await remaining[i].update({ position: i }, { transaction });
        }
      }
    });

    return res.json({ success: true, message: '목록이 삭제되었습니다.' });
  } catch (error: any) {
    console.error('deleteWorkBoardList:', error);
    return res.status(500).json({ success: false, message: '목록 삭제에 실패했습니다.' });
  }
};

export const createWorkBoardCard = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureWorkBoardCardSchema();
    const user = req.user!;
    const boardId = parseInt(req.params.boardId, 10);
    const listId = parseInt(req.params.listId, 10);
    const { board, member } = await findBoardForUser(boardId, user, true);
    if (!board || (!member && user.role !== 'root')) {
      return res.status(404).json({ success: false, message: '권한이 없습니다.' });
    }

    const list = await WorkBoardList.findOne({ where: { id: listId, board_id: board.id } });
    if (!list) {
      return res.status(404).json({ success: false, message: '목록을 찾을 수 없습니다.' });
    }

    const { title, description, assignee_user_id, reference_user_ids, due_date, color } = req.body;
    if (!title || String(title).trim().length === 0) {
      return res.status(400).json({ success: false, message: '카드 제목이 필요합니다.' });
    }

    if (assignee_user_id) {
      const assignee = await User.findByPk(assignee_user_id);
      if (!assignee || assignee.company_id !== board.company_id || assignee.tenant_id !== board.tenant_id) {
        return res.status(400).json({ success: false, message: '같은 회사 사용자만 담당자로 지정할 수 있습니다.' });
      }
    }
    const colorParsed = normalizeCardColor(color);
    if (!colorParsed.valid) {
      return res.status(400).json({ success: false, message: '카드 색상은 #RRGGBB 형식이어야 합니다.' });
    }
    const parsedReferenceUserIds = parseReferenceUserIds(reference_user_ids);
    if (!parsedReferenceUserIds.valid) {
      return res.status(400).json({ success: false, message: '참조자는 사용자 ID 배열이어야 합니다.' });
    }
    if (parsedReferenceUserIds.value && parsedReferenceUserIds.value.length > 0) {
      const refUsers = await User.findAll({
        where: {
          id: { [Op.in]: parsedReferenceUserIds.value },
          tenant_id: board.tenant_id,
          company_id: board.company_id
        },
        attributes: ['id']
      });
      if (refUsers.length !== parsedReferenceUserIds.value.length) {
        return res.status(400).json({ success: false, message: '참조자는 같은 회사 사용자만 지정할 수 있습니다.' });
      }
    }

    const max = await WorkBoardCard.max('position', { where: { list_id: list.id } });
    const position = max !== null && (max as number) >= 0 ? (max as number) + 1 : 0;

    const boardLists = await WorkBoardList.findAll({
      where: { board_id: board.id },
      attributes: ['id', 'title', 'position'],
      order: [['position', 'ASC']]
    });
    const completedListId = resolveCompletedListId(
      boardLists.map((l) => l.get({ plain: true }) as { id: number; title: string; position: number })
    );
    const isCompletedList = completedListId != null && list.id === completedListId;

    const card = await WorkBoardCard.create({
      list_id: list.id,
      title: String(title).trim().slice(0, 300),
      description: normalizeCardDescription(description),
      position,
      assignee_user_id: assignee_user_id || null,
      reference_user_ids: parsedReferenceUserIds.value ?? [],
      due_date: due_date || null,
      color: colorParsed.value ?? null,
      created_by: user.id,
      completed_at: isCompletedList ? new Date() : null
    });

    const withUser = await WorkBoardCard.findByPk(card.id, {
      include: [{ model: User, as: 'assignee', attributes: ['id', 'username', 'userid', 'email'] }]
    });

    if (assignee_user_id && Number(assignee_user_id) !== Number(user.id)) {
      sendCardAssignmentNotification(req, {
        targetUserId: Number(assignee_user_id),
        boardId: board.id,
        boardName: board.name,
        cardId: card.id,
        cardTitle: card.title,
        actorName: user.username || user.userid || '사용자'
      });
    }

    res.status(201).json({ success: true, data: withUser });
  } catch (error: any) {
    console.error('createWorkBoardCard:', error);
    res.status(500).json({ success: false, message: '카드 생성에 실패했습니다.' });
  }
};

export const updateWorkBoardCard = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureWorkBoardCardSchema();
    const user = req.user!;
    const boardId = parseInt(req.params.boardId, 10);
    const cardId = parseInt(req.params.cardId, 10);
    const { board, member } = await findBoardForUser(boardId, user, true);
    if (!board || (!member && user.role !== 'root')) {
      return res.status(404).json({ success: false, message: '권한이 없습니다.' });
    }

    const card = await WorkBoardCard.findByPk(cardId, {
      include: [{ model: WorkBoardList, as: 'list' }]
    });
    if (!card || (card as any).list.board_id !== board.id) {
      return res.status(404).json({ success: false, message: '카드를 찾을 수 없습니다.' });
    }

    const { title, description, assignee_user_id, reference_user_ids, due_date, color } = req.body;
    const patch: any = {};
    const previousAssigneeUserId = (card as any).assignee_user_id ? Number((card as any).assignee_user_id) : null;
    if (title !== undefined) patch.title = String(title).trim().slice(0, 300);
    if (description !== undefined) patch.description = normalizeCardDescription(description);
    if (due_date !== undefined) patch.due_date = due_date || null;
    const colorParsed = normalizeCardColor(color);
    if (!colorParsed.valid) {
      return res.status(400).json({ success: false, message: '카드 색상은 #RRGGBB 형식이어야 합니다.' });
    }
    if (colorParsed.value !== undefined) patch.color = colorParsed.value;
    const parsedReferenceUserIds = parseReferenceUserIds(reference_user_ids);
    if (!parsedReferenceUserIds.valid) {
      return res.status(400).json({ success: false, message: '참조자는 사용자 ID 배열이어야 합니다.' });
    }
    if (parsedReferenceUserIds.value !== undefined) {
      if (parsedReferenceUserIds.value.length > 0) {
        const refUsers = await User.findAll({
          where: {
            id: { [Op.in]: parsedReferenceUserIds.value },
            tenant_id: board.tenant_id,
            company_id: board.company_id
          },
          attributes: ['id']
        });
        if (refUsers.length !== parsedReferenceUserIds.value.length) {
          return res.status(400).json({ success: false, message: '참조자는 같은 회사 사용자만 지정할 수 있습니다.' });
        }
      }
      patch.reference_user_ids = parsedReferenceUserIds.value;
    }
    if (assignee_user_id !== undefined) {
      if (assignee_user_id === null) {
        patch.assignee_user_id = null;
      } else {
        const assignee = await User.findByPk(assignee_user_id);
        if (!assignee || assignee.company_id !== board.company_id || assignee.tenant_id !== board.tenant_id) {
          return res.status(400).json({ success: false, message: '같은 회사 사용자만 담당자로 지정할 수 있습니다.' });
        }
        patch.assignee_user_id = assignee_user_id;
      }
    }

    await card.update(patch);
    const withUser = await WorkBoardCard.findByPk(card.id, {
      include: [{ model: User, as: 'assignee', attributes: ['id', 'username', 'userid', 'email'] }]
    });

    const nextAssigneeUserId = patch.assignee_user_id === undefined
      ? previousAssigneeUserId
      : (patch.assignee_user_id ? Number(patch.assignee_user_id) : null);
    if (
      nextAssigneeUserId &&
      nextAssigneeUserId !== previousAssigneeUserId &&
      nextAssigneeUserId !== Number(user.id)
    ) {
      sendCardAssignmentNotification(req, {
        targetUserId: nextAssigneeUserId,
        boardId: board.id,
        boardName: board.name,
        cardId: card.id,
        cardTitle: patch.title || card.title,
        actorName: user.username || user.userid || '사용자'
      });
    }
    res.json({ success: true, data: withUser });
  } catch (error: any) {
    console.error('updateWorkBoardCard:', error);
    res.status(500).json({ success: false, message: '카드 수정에 실패했습니다.' });
  }
};

async function normalizeListPositions(listId: number, transaction?: any) {
  const cards = await WorkBoardCard.findAll({
    where: { list_id: listId },
    order: [
      ['position', 'ASC'],
      ['id', 'ASC']
    ],
    transaction
  });
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].position !== i) {
      await cards[i].update({ position: i }, { transaction });
    }
  }
}

export const moveWorkBoardCard = async (req: RequestWithUser, res: Response) => {
  try {
    const user = req.user!;
    const boardId = parseInt(req.params.boardId, 10);
    const cardId = parseInt(req.params.cardId, 10);
    const { list_id: targetListId, index } = req.body;

    if (targetListId === undefined || index === undefined || index < 0) {
      return res.status(400).json({ success: false, message: 'list_id와 index(0부터)가 필요합니다.' });
    }

    const { board, member } = await findBoardForUser(boardId, user, true);
    if (!board || (!member && user.role !== 'root')) {
      return res.status(404).json({ success: false, message: '권한이 없습니다.' });
    }

    await sequelize.transaction(async (transaction) => {
      const card = await WorkBoardCard.findByPk(cardId, {
        include: [{ model: WorkBoardList, as: 'list' }],
        transaction
      });
      if (!card || (card as any).list.board_id !== board!.id) {
        throw new Error('NOT_FOUND');
      }

      const newList = await WorkBoardList.findOne({
        where: { id: targetListId, board_id: board!.id },
        transaction
      });
      if (!newList) {
        throw new Error('BAD_LIST');
      }

      const oldListId = card.list_id;

      const boardLists = await WorkBoardList.findAll({
        where: { board_id: board!.id },
        attributes: ['id', 'title', 'position'],
        order: [['position', 'ASC']],
        transaction
      });
      const completedListId = resolveCompletedListId(
        boardLists.map((l) => l.get({ plain: true }) as { id: number; title: string; position: number })
      );
      const assigneeUserId =
        (card as any).assignee_user_id != null ? Number((card as any).assignee_user_id) : null;
      const uid = Number(user.id);
      const isBoardOwner = member && (member as any).role === 'owner';
      const isAssignee = assigneeUserId != null && assigneeUserId === uid;
      const canMoveToCompleted =
        user.role === 'root' || isBoardOwner || assigneeUserId == null || isAssignee;
      const isMovingIntoCompleted =
        oldListId !== newList.id &&
        completedListId != null &&
        newList.id === completedListId;
      if (isMovingIntoCompleted && !canMoveToCompleted) {
        throw new Error('FORBIDDEN_COMPLETE');
      }

      const oldId = card.id;

      const others = await WorkBoardCard.findAll({
        where: { list_id: newList.id, id: { [Op.ne]: oldId } },
        order: [
          ['position', 'ASC'],
          ['id', 'ASC']
        ],
        transaction
      });

      const orderedIds = others.map((c) => c.id);
      const insertAt = Math.min(parseInt(String(index), 10), orderedIds.length);
      orderedIds.splice(insertAt, 0, oldId);

      const patch: Record<string, unknown> = { list_id: newList.id };
      if (isMovingIntoCompleted) {
        patch.completed_at = new Date();
      } else if (
        oldListId !== newList.id &&
        completedListId != null &&
        oldListId === completedListId
      ) {
        patch.completed_at = null;
      }
      await card.update(patch, { transaction });

      for (let i = 0; i < orderedIds.length; i++) {
        await WorkBoardCard.update(
          { position: i, list_id: newList.id },
          { where: { id: orderedIds[i] }, transaction }
        );
      }

      if (oldListId !== newList.id) {
        await normalizeListPositions(oldListId, transaction);
      }
    });

    res.json({ success: true, message: '이동되었습니다.' });
  } catch (error: any) {
    if (error?.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: '카드를 찾을 수 없습니다.' });
    }
    if (error?.message === 'BAD_LIST') {
      return res.status(400).json({ success: false, message: '대상 목록이 없습니다.' });
    }
    if (error?.message === 'FORBIDDEN_COMPLETE') {
      return res.status(403).json({
        success: false,
        message: '완료 처리는 담당자 또는 보드 소유자만 할 수 있습니다.'
      });
    }
    console.error('moveWorkBoardCard:', error);
    res.status(500).json({ success: false, message: '카드 이동에 실패했습니다.' });
  }
};

export const deleteWorkBoardCard = async (req: RequestWithUser, res: Response) => {
  try {
    const user = req.user!;
    const boardId = parseInt(req.params.boardId, 10);
    const cardId = parseInt(req.params.cardId, 10);
    const { board, member } = await findBoardForUser(boardId, user, true);
    if (!board || (!member && user.role !== 'root')) {
      return res.status(404).json({ success: false, message: '권한이 없습니다.' });
    }

    const card = await WorkBoardCard.findByPk(cardId, {
      include: [{ model: WorkBoardList, as: 'list' }]
    });
    if (!card || (card as any).list.board_id !== board.id) {
      return res.status(404).json({ success: false, message: '카드를 찾을 수 없습니다.' });
    }

    const listId = card.list_id;
    await card.destroy();
    await normalizeListPositions(listId);
    res.json({ success: true, message: '삭제되었습니다.' });
  } catch (error: any) {
    console.error('deleteWorkBoardCard:', error);
    res.status(500).json({ success: false, message: '삭제에 실패했습니다.' });
  }
};

export const getWorkBoardCardComments = async (req: RequestWithUser, res: Response) => {
  try {
    const user = req.user!;
    const boardId = parseInt(req.params.boardId, 10);
    const cardId = parseInt(req.params.cardId, 10);
    const { board, member } = await findBoardForUser(boardId, user);
    if (!board || (!member && user.role !== 'root' && user.role !== 'audit')) {
      return res.status(404).json({ success: false, message: '권한이 없습니다.' });
    }

    const card = await WorkBoardCard.findByPk(cardId, {
      include: [{ model: WorkBoardList, as: 'list' }]
    });
    if (!card || (card as any).list.board_id !== board.id) {
      return res.status(404).json({ success: false, message: '카드를 찾을 수 없습니다.' });
    }

    const comments = await WorkBoardCardComment.findAll({
      where: { card_id: card.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'userid', 'email'] }],
      order: [['created_at', 'ASC']]
    });
    return res.json({ success: true, data: comments });
  } catch (error: any) {
    if (isMissingCommentsTableError(error)) {
      return res.json({ success: true, data: [] });
    }
    console.error('getWorkBoardCardComments:', error);
    return res.status(500).json({ success: false, message: '댓글 조회에 실패했습니다.' });
  }
};

export const createWorkBoardCardComment = async (req: RequestWithUser, res: Response) => {
  try {
    const user = req.user!;
    const boardId = parseInt(req.params.boardId, 10);
    const cardId = parseInt(req.params.cardId, 10);
    const { content, mention_user_ids, parent_id: parentIdBody } = req.body;
    const { board, member } = await findBoardForUser(boardId, user, true);
    if (!board || (!member && user.role !== 'root')) {
      return res.status(404).json({ success: false, message: '권한이 없습니다.' });
    }
    if (!content || String(content).trim().length === 0) {
      return res.status(400).json({ success: false, message: '댓글 내용을 입력해주세요.' });
    }

    const card = await WorkBoardCard.findByPk(cardId, {
      include: [{ model: WorkBoardList, as: 'list' }]
    });
    if (!card || (card as any).list.board_id !== board.id) {
      return res.status(404).json({ success: false, message: '카드를 찾을 수 없습니다.' });
    }

    let parentId: number | null = null;
    if (parentIdBody !== undefined && parentIdBody !== null && parentIdBody !== '') {
      const parsed = parseInt(String(parentIdBody), 10);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return res.status(400).json({ success: false, message: '유효하지 않은 답글 대상입니다.' });
      }
      const parentComment = await WorkBoardCardComment.findOne({
        where: { id: parsed, card_id: card.id }
      });
      if (!parentComment) {
        return res.status(404).json({ success: false, message: '답글 대상 댓글을 찾을 수 없습니다.' });
      }
      if ((parentComment as any).parent_id) {
        return res.status(400).json({
          success: false,
          message: '대댓글에는 답글을 달 수 없습니다. 상위 댓글에만 답글을 달 수 있습니다.'
        });
      }
      parentId = parsed;
    }

    const boardMembers = await WorkBoardMember.findAll({
      where: { board_id: board.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'userid'] }]
    });
    const boardMemberIdSet = new Set(boardMembers.map((m) => Number(m.user_id)));
    const mentionIds = new Set<number>();

    if (mention_user_ids !== undefined) {
      if (!Array.isArray(mention_user_ids)) {
        return res.status(400).json({ success: false, message: '멘션 대상은 사용자 ID 배열이어야 합니다.' });
      }
      for (const rawId of mention_user_ids) {
        const mentionUserId = Number(rawId);
        if (!Number.isInteger(mentionUserId) || mentionUserId <= 0 || !boardMemberIdSet.has(mentionUserId)) {
          return res.status(400).json({ success: false, message: '멘션 대상은 같은 보드 멤버만 지정할 수 있습니다.' });
        }
        if (mentionUserId !== user.id) {
          mentionIds.add(mentionUserId);
        }
      }
    }

    const mentionTokens = Array.from(String(content).matchAll(/@([^\s@]+)/g)).map((match) =>
      match[1].trim().toLowerCase()
    );
    if (mentionTokens.length > 0) {
      const useridToId = new Map<string, number>();
      const usernameToId = new Map<string, number>();
      for (const memberRow of boardMembers as any[]) {
        const memberUserId = Number(memberRow.user_id);
        const memberUserid = String(memberRow.user?.userid || '').trim().toLowerCase();
        const memberUsername = String(memberRow.user?.username || '')
          .replace(/\s+/g, '')
          .trim()
          .toLowerCase();
        if (memberUserid) useridToId.set(memberUserid, memberUserId);
        if (memberUsername) usernameToId.set(memberUsername, memberUserId);
      }
      for (const token of mentionTokens) {
        const normalized = token.replace(/\s+/g, '').toLowerCase();
        const matchedId = useridToId.get(normalized) || usernameToId.get(normalized);
        if (matchedId && matchedId !== user.id) {
          mentionIds.add(matchedId);
        }
      }
    }

    const comment = await WorkBoardCardComment.create({
      card_id: card.id,
      user_id: user.id,
      parent_id: parentId,
      content: String(content).trim().slice(0, 5000)
    });
    const full = await WorkBoardCardComment.findByPk(comment.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'userid', 'email'] }]
    });

    if (mentionIds.size > 0) {
      const actorName = user.username || user.userid || '사용자';
      const socketService = (req as any).socketService as SocketService | undefined;
      for (const mentionUserId of mentionIds) {
        pushNotification(
          {
            title: '댓글 멘션',
            message: `${actorName}님이 "${card.title}" 카드 댓글에서 회원님을 언급했습니다.`,
            type: 'info',
            target_type: 'user',
            target_id: mentionUserId,
            data: {
              feature: 'work_board_comment',
              board_id: board.id,
              board_name: board.name,
              card_id: card.id,
              card_title: card.title,
              comment_id: comment.id
            },
            tenant_id: user.tenant_id,
            company_id: user.company_id,
            sender_user_id: user.id
          },
          socketService
        );
      }
    }

    return res.status(201).json({ success: true, data: full });
  } catch (error: any) {
    if (isMissingCommentsTableError(error)) {
      return res.status(503).json({
        success: false,
        message: '댓글 테이블이 아직 준비되지 않았습니다. 관리자에게 마이그레이션 적용을 요청해주세요.'
      });
    }
    console.error('createWorkBoardCardComment:', error);
    return res.status(500).json({ success: false, message: '댓글 등록에 실패했습니다.' });
  }
};

export const deleteWorkBoardCardComment = async (req: RequestWithUser, res: Response) => {
  try {
    const user = req.user!;
    const boardId = parseInt(req.params.boardId, 10);
    const cardId = parseInt(req.params.cardId, 10);
    const commentId = parseInt(req.params.commentId, 10);
    const { board, member } = await findBoardForUser(boardId, user, true);
    if (!board || (!member && user.role !== 'root')) {
      return res.status(404).json({ success: false, message: '권한이 없습니다.' });
    }

    const card = await WorkBoardCard.findByPk(cardId, {
      include: [{ model: WorkBoardList, as: 'list' }]
    });
    if (!card || (card as any).list.board_id !== board.id) {
      return res.status(404).json({ success: false, message: '카드를 찾을 수 없습니다.' });
    }

    const comment = await WorkBoardCardComment.findOne({
      where: { id: commentId, card_id: card.id }
    });
    if (!comment) {
      return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
    }

    const isOwner = member?.role === 'owner' || user.role === 'root';
    const isMine = comment.user_id === user.id;
    if (!isOwner && !isMine) {
      return res.status(403).json({ success: false, message: '본인 댓글만 삭제할 수 있습니다.' });
    }

    await comment.destroy();
    return res.json({ success: true, message: '댓글이 삭제되었습니다.' });
  } catch (error: any) {
    if (isMissingCommentsTableError(error)) {
      return res.status(503).json({
        success: false,
        message: '댓글 테이블이 아직 준비되지 않았습니다. 관리자에게 마이그레이션 적용을 요청해주세요.'
      });
    }
    console.error('deleteWorkBoardCardComment:', error);
    return res.status(500).json({ success: false, message: '댓글 삭제에 실패했습니다.' });
  }
};

export const getWorkBoardMembers = async (req: RequestWithUser, res: Response) => {
  try {
    const user = req.user!;
    const boardId = parseInt(req.params.boardId, 10);
    const { board, member } = await findBoardForUser(boardId, user);
    if (!board || (!member && user.role !== 'root' && user.role !== 'audit')) {
      return res.status(404).json({ success: false, message: '권한이 없습니다.' });
    }

    const members = await WorkBoardMember.findAll({
      where: { board_id: board.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'userid', 'email', 'department'] }]
    });
    res.json({ success: true, data: members });
  } catch (error: any) {
    console.error('getWorkBoardMembers:', error);
    res.status(500).json({ success: false, message: '멤버 목록을 불러오지 못했습니다.' });
  }
};

export const inviteWorkBoardMember = async (req: RequestWithUser, res: Response) => {
  try {
    const user = req.user!;
    const boardId = parseInt(req.params.boardId, 10);
    const { user_id: targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'user_id가 필요합니다.' });
    }

    const { board, member } = await findBoardForUser(boardId, user, true);
    if (!board || (!member && user.role !== 'root')) {
      return res.status(404).json({ success: false, message: '권한이 없습니다.' });
    }

    const target = await User.findByPk(targetUserId);
    if (!target) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
    if (target.company_id !== board.company_id || target.tenant_id !== board.tenant_id) {
      return res.status(403).json({ success: false, message: '같은 회사 사용자만 초대할 수 있습니다.' });
    }
    if (target.id === user.id) {
      return res.status(400).json({ success: false, message: '이미 보드에 포함된 계정입니다.' });
    }

    const [row, created] = await WorkBoardMember.findOrCreate({
      where: { board_id: board.id, user_id: target.id },
      defaults: {
        board_id: board.id,
        user_id: target.id,
        role: 'member',
        invited_by: user.id
      }
    });

    if (!created) {
      return res.status(400).json({ success: false, message: '이미 초대된 사용자입니다.' });
    }

    const withUser = await WorkBoardMember.findByPk(row.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'userid', 'email'] }]
    });

    res.status(201).json({ success: true, data: withUser });
  } catch (error: any) {
    console.error('inviteWorkBoardMember:', error);
    res.status(500).json({ success: false, message: '초대에 실패했습니다.' });
  }
};

export const removeWorkBoardMember = async (req: RequestWithUser, res: Response) => {
  try {
    const user = req.user!;
    const boardId = parseInt(req.params.boardId, 10);
    const memberUserId = parseInt(req.params.userId, 10);

    const { board, member } = await findBoardForUser(boardId, user, true);
    if (!board || (!member && user.role !== 'root')) {
      return res.status(404).json({ success: false, message: '권한이 없습니다.' });
    }

    const target = await WorkBoardMember.findOne({
      where: { board_id: board.id, user_id: memberUserId }
    });
    if (!target) {
      return res.status(404).json({ success: false, message: '멤버를 찾을 수 없습니다.' });
    }
    if (target.role === 'owner') {
      return res.status(400).json({ success: false, message: '보드 소유자는 제거할 수 없습니다.' });
    }
    if (member.role !== 'owner' && user.role !== 'root' && memberUserId !== user.id) {
      return res.status(403).json({ success: false, message: '멤버를 내보낼 권한이 없습니다.' });
    }

    await target.destroy();
    res.json({ success: true, message: '제거되었습니다.' });
  } catch (error: any) {
    console.error('removeWorkBoardMember:', error);
    res.status(500).json({ success: false, message: '제거에 실패했습니다.' });
  }
};

export const updateWorkBoardMember = async (req: RequestWithUser, res: Response) => {
  try {
    const user = req.user!;
    const boardId = parseInt(req.params.boardId, 10);
    const memberUserId = parseInt(req.params.userId, 10);
    const { role } = req.body as { role?: string };

    if (role !== 'owner' && role !== 'member') {
      return res.status(400).json({ success: false, message: 'role은 owner 또는 member만 가능합니다.' });
    }

    const { board, member } = await findBoardForUser(boardId, user, true);
    if (!board || (!member && user.role !== 'root')) {
      return res.status(404).json({ success: false, message: '권한이 없습니다.' });
    }
    if (member?.role !== 'owner' && user.role !== 'root') {
      return res.status(403).json({ success: false, message: '멤버 역할을 변경할 권한이 없습니다.' });
    }

    const target = await WorkBoardMember.findOne({
      where: { board_id: board.id, user_id: memberUserId }
    });
    if (!target) {
      return res.status(404).json({ success: false, message: '멤버를 찾을 수 없습니다.' });
    }

    if (target.role === role) {
      const same = await WorkBoardMember.findByPk(target.id, {
        include: [{ model: User, as: 'user', attributes: ['id', 'username', 'userid', 'email', 'department'] }]
      });
      return res.json({ success: true, data: same || target });
    }

    if (target.role === 'owner' && role === 'member') {
      const ownerCount = await WorkBoardMember.count({
        where: { board_id: board.id, role: 'owner' }
      });
      if (ownerCount <= 1) {
        return res.status(400).json({ success: false, message: '마지막 소유자는 멤버로 변경할 수 없습니다.' });
      }
    }

    await target.update({ role });
    const updated = await WorkBoardMember.findByPk(target.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'userid', 'email', 'department'] }]
    });
    return res.json({ success: true, data: updated || target });
  } catch (error: any) {
    console.error('updateWorkBoardMember:', error);
    return res.status(500).json({ success: false, message: '멤버 역할 변경에 실패했습니다.' });
  }
};
