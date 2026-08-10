import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Pagination,
  Popper,
  Paper,
  TextField,
  Tooltip,
  Typography,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  ChatBubbleOutline as ChatBubbleOutlineIcon,
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditOutlinedIcon,
  MoreHoriz as MoreHorizIcon,
  Notes as NotesIcon,
  PersonAdd as PersonAddIcon,
  PhotoOutlined as PhotoOutlinedIcon,
  LibraryAddOutlined as LibraryAddOutlinedIcon,
  Search as SearchIcon,
  VisibilityOutlined as VisibilityOutlinedIcon
} from '@mui/icons-material';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  closestCenter,
  closestCorners,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MeasuringStrategy,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { restrictToWindowEdges, snapCenterToCursor } from '@dnd-kit/modifiers';
import { workBoardService } from '../../services/api';
import { useMenuStore, useStore } from '../../store';
import { filterActiveCompanyUsers, useReferenceDataStore } from '../../store/referenceDataStore';
import { findMenuIdByPath } from '../../utils/findMenuByPath';
import { showErrorPopup, showSuccessPopup, showSuccessToast } from '../../utils/errorHandler';
import { getUploadUrl } from '../../utils/uploadUrl';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { usePhotoPreviewOptional } from '../../components/Common/PhotoPreviewProvider';
import RichTextEditor from '../../components/RichTextEditor/RichTextEditor';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import { mvsOutlinedLabelProps } from '../../theme/mvsLayout';

const CARD_DETAIL_OUTLINED = mvsOutlinedLabelProps;

type BoardList = {
  id: number;
  title: string;
  description?: string | null;
  position: number;
  assignee_user_id?: number | null;
  assignee?: { id: number; username: string; userid?: string; avatar_url?: string | null } | null;
  cards?: BoardCard[];
};

type BoardCard = {
  id: number;
  title: string;
  description?: string;
  color?: string | null;
  reference_user_ids?: number[];
  due_date?: string | null;
  position: number;
  list_id?: number;
  created_by?: number | null;
  completed_at?: string | null;
  assignee?: { id: number; username: string; avatar_url?: string | null };
  comments?: BoardCardComment[];
};

type BoardCardComment = {
  id: number;
  card_id: number;
  user_id?: number | null;
  parent_id?: number | null;
  content: string;
  created_at?: string;
  user?: { id: number; username?: string; userid?: string };
};

function sortBoardCardCommentsThreaded(comments: BoardCardComment[]): BoardCardComment[] {
  const list = (comments || []).slice();
  const byParent = new Map<number | null, BoardCardComment[]>();
  for (const c of list) {
    const pid = c.parent_id != null && c.parent_id > 0 ? c.parent_id : null;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid)!.push(c);
  }
  byParent.forEach((arr) => {
    arr.sort((a: BoardCardComment, b: BoardCardComment) => {
      const ta = new Date(a.created_at || '').getTime() || 0;
      const tb = new Date(b.created_at || '').getTime() || 0;
      return ta - tb;
    });
  });
  const out: BoardCardComment[] = [];
  const walk = (pid: number | null) => {
    const kids = byParent.get(pid);
    if (!kids) return;
    for (const c of kids) {
      out.push(c);
      walk(c.id);
    }
  };
  walk(null);
  return out;
}

type CardDetailState = {
  cardId: number;
  /** 칸반에서 막 생성된 카드를 연 경우: 카드 세부 저장 전까지 댓글 비활성 */
  blockCommentsUntilDetailSave: boolean;
  title: string;
  description: string;
  dueDate: string;
  color: string;
  assigneeUserId: number | null;
  referenceUserIds: number[];
  createdBy: number | null;
  listId: number;
  originalListId: number;
  listTitle: string;
};

type MemberOption = {
  id: number;
  label: string;
  userid: string;
};

const CARD_COLOR_PRESETS = [
  '#1976D2',
  '#2E7D32',
  '#ED6C02',
  '#D32F2F',
  '#7B1FA2',
  '#00897B',
  '#0288D1',
  '#C2185B',
  '#455A64',
  '#6D4C41'
];

const COMPLETED_LIST_KEYWORDS = ['업무 완료', '완료', '종료', 'done', 'completed', 'closed', 'work completed'];

const isCompletedListTitle = (title?: string): boolean => {
  const normalized = String(title || '').trim().toLowerCase();
  if (!normalized) return false;
  return COMPLETED_LIST_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()));
};

const resolveCompletedList = <T extends { id: number; title: string; position: number }>(
  lists: T[]
): T | undefined => {
  const sorted = [...lists].sort((a, b) => a.position - b.position);
  const preferred = sorted.find((list) => {
    const title = String(list.title || '').trim().toLowerCase();
    return title === '업무 완료' || title.includes('업무 완료') || title.includes('work completed');
  });
  if (preferred) return preferred;
  const byKeyword = sorted.find((list) => isCompletedListTitle(list.title));
  if (byKeyword) return byKeyword;
  // 완료 열이 명시되지 않은 보드: 2열 이상이면 마지막 열을 완료 이동 대상으로 사용
  if (sorted.length >= 2) return sorted[sorted.length - 1];
  return undefined;
};

/** DB에 한글 기본값으로 저장된 리스트 제목을 영어 UI에서만 치환 (저장 값은 그대로) */
const displayBoardListTitle = (title: string, lang: 'ko' | 'en'): string => {
  if (lang !== 'en') return String(title || '');
  const raw = String(title || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  const map: Record<string, string> = {
    할일: 'To Do',
    '할 일': 'To Do',
    todo: 'To Do',
    'to do': 'To Do',
    'to-do': 'To Do',
    진행중: 'In Progress',
    '진행 중': 'In Progress',
    진행: 'In Progress',
    'in progress': 'In Progress',
    완료: 'Done',
    '업무 완료': 'Done',
    종료: 'Closed',
    대기: 'Pending',
    '검토 대기': 'Pending review',
    '검토중': 'In review',
    '검토 중': 'In review',
    보류: 'On hold',
    백로그: 'Backlog'
  };
  if (map[raw]) return map[raw];
  if (map[lower]) return map[lower];
  const nospace = raw.replace(/\s+/g, '');
  if (map[nospace]) return map[nospace];
  return raw;
};

const decodeHtmlEntities = (value: string): string => {
  if (typeof window === 'undefined') return value;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

const normalizeRichTextHtml = (html?: string): string => {
  if (!html) return '';
  const raw = String(html);
  if (!raw.trim()) return '';
  if (raw.includes('&lt;') || raw.includes('&gt;') || raw.includes('&quot;') || raw.includes('&#')) {
    return decodeHtmlEntities(raw);
  }
  return raw;
};

const getPlainTextFromHtml = (html?: string): string => {
  const normalizedHtml = normalizeRichTextHtml(html);
  if (!normalizedHtml) return '';

  if (typeof window === 'undefined') {
    return normalizedHtml
      .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g, ' ')
      .replace(/src\s*=\s*["'][^"']*["']/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<img[^>]*>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const root = document.createElement('div');
  root.innerHTML = normalizedHtml;
  root.querySelectorAll('style, script, img').forEach((node) => node.remove());
  return (root.textContent || '')
    .replace(/src\s*=\s*["'][^"']*["']/gi, ' ')
    .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const isRichTextEmpty = (html?: string): boolean => {
  const normalizedHtml = normalizeRichTextHtml(html);
  if (!normalizedHtml) return true;
  const text = getPlainTextFromHtml(normalizedHtml);
  if (text.length > 0) return false;
  return !/<img\s+[^>]*src=/i.test(normalizedHtml);
};

const formatDueDate = (date?: string | null): string => {
  if (!date) return '';
  const raw = String(date).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  return raw;
};

const formatDateTime = (value?: string): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
};

const DRAG_TRANSITION = 'transform 40ms ease-out';
const DRAG_LAYOUT_TRANSITION = 'none';

const BOARD_PAN_IGNORE_SELECTOR = [
  '[data-kanban-card]',
  '[data-kanban-list-handle]',
  '[data-board-no-pan]',
  'button',
  'a',
  'input',
  'textarea',
  'select',
  '[role="button"]',
  '[role="menuitem"]',
  '[contenteditable="true"]',
  '.MuiButtonBase-root',
  '.MuiChip-root',
  '.MuiInputBase-root',
  '.MuiAutocomplete-root',
].join(',');

/** 칸반 — 트렐로형 라운드·라벤더 보드 */
const KANBAN_DETAIL_SHELL_RADIUS = '8px';
const KANBAN_SURFACE_RADIUS = '8px';
const KANBAN_CHIP_RADIUS = '6px';
const KANBAN_CONTROL_RADIUS = '8px';
const KANBAN_COLUMN_RADIUS = '8px';
const KANBAN_CARD_RADIUS = '6px';

/** 소분류(칸반 열) — 불투명 패널 + 얇은 보더 */
const KANBAN_COLUMN_BG = '#F1F5F9';
const KANBAN_COLUMN_BORDER = '1px solid #E2E8F0';
const KANBAN_COLUMN_SHADOW = 'none';
const KANBAN_MEMBER_PANEL_BG = '#F8FAFC';
const KANBAN_MEMBER_PANEL_BORDER = '1px solid #E2E8F0';
const KANBAN_CARD_BG = '#FFFFFF';
const KANBAN_CARD_BORDER = '1px solid #D8E1EC';
const KANBAN_CARD_SHADOW = 'none';
const KANBAN_CARD_HOVER_SHADOW = '0 1px 2px rgba(15, 23, 42, 0.08)';
const KANBAN_TITLE_DESC_GAP = 0.75;
const KANBAN_META_ICON_COLOR = '#6B778C';

/** 칸반 카드 최소 높이(열·드래그 미리보기 동일) */
const WORK_BOARD_CARD_MIN_HEIGHT_PX = 68;

/** 보드 멤버 — 겹침 원형 아바타 */
const BOARD_MEMBER_AVATAR_SIZE = 32;
const BOARD_MEMBER_AVATAR_OVERLAP_PX = 10;
const BOARD_MEMBER_AVATAR_MAX = 20;

const AVATAR_PALETTE = ['#6554C0', '#00B8D9', '#36B37E', '#FF5630', '#FFAB00', '#403294'];

const kanbanMetaChipSx = {
  height: 22,
  fontWeight: 600,
  fontSize: '0.68rem',
  borderRadius: KANBAN_CHIP_RADIUS,
  border: 'none',
  bgcolor: '#F0F4F8',
  color: '#475569',
} as const;

const cardDetailFieldLabelSx = {
  display: 'block',
  mb: 0.65,
  fontWeight: 700,
  fontSize: '0.75rem',
  lineHeight: '20px',
  color: '#475569',
} as const;

const cardDetailSectionPaperSx = {
  p: 1.25,
  flexShrink: 0,
  borderRadius: KANBAN_SURFACE_RADIUS,
  border: 'none',
  bgcolor: 'transparent',
  boxShadow: 'none',
} as const;

const cardDetailFormSectionSx = {
  borderRadius: KANBAN_SURFACE_RADIUS,
  p: 0,
  border: 'none',
  bgcolor: 'transparent',
  boxShadow: 'none',
  flexShrink: 0,
} as const;

const cardDetailInputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: KANBAN_CONTROL_RADIUS,
    bgcolor: '#FFFFFF',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#94A3B8' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
  },
  '& .MuiInputBase-input': { fontSize: '0.875rem' },
} as const;

const cardDetailOutlinedWhiteSx = {
  ...cardDetailInputSx,
  '& .MuiOutlinedInput-root': {
    ...(cardDetailInputSx['& .MuiOutlinedInput-root'] as Record<string, unknown>),
    bgcolor: '#FFFFFF',
    height: 46,
    '&:hover': { bgcolor: '#F8FAFC' },
    '&.Mui-focused': { bgcolor: '#FFFFFF' },
    '&.Mui-disabled': { bgcolor: '#F1F5F9' },
  },
  '& .MuiSelect-select': { py: '10px' },
} as const;

/** 대분류(열) 기본 너비 — flex-grow 없이 고정해 행에 열이 적어도 카드 너비가 동일하게 유지 */
const WORK_BOARD_COLUMN_WIDTH_PX = 272;

const isHexColor = (value?: string | null): value is string => Boolean(value && /^#[0-9a-fA-F]{6}$/.test(value));

const hexToRgba = (hex: string, alphaValue: number) => {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alphaValue})`;
};

/** 댓글 본문의 @userid / @이름 을 구분색으로 표시 */
function renderCommentWithMentions(text: string): React.ReactNode {
  if (text == null || text === '') return null;
  const re = /@[^\s@]+/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push(text.slice(last, m.index));
    }
    const token = m[0];
    out.push(
      <Box
        component="span"
        key={`mention-${m.index}-${key++}`}
        sx={{
          color: '#4C6A6E',
          fontWeight: 700,
          bgcolor: alpha('#1D4E7C', 0.14),
          px: 0.45,
          py: 0.1,
          borderRadius: 0.75,
          border: `1px solid ${alpha('#1D4E7C', 0.28)}`,
        }}
      >
        {token}
      </Box>
    );
    last = m.index + token.length;
  }
  if (last < text.length) {
    out.push(text.slice(last));
  }
  return out.length > 0 ? <>{out}</> : text;
}

const normalizeBoardData = (payload: any) => {
  if (!payload) return payload;
  const lists = Array.isArray(payload.lists)
    ? payload.lists.map((list: any) => ({
        ...list,
        cards: Array.isArray(list.cards)
          ? list.cards.map((card: any) => ({
              ...card,
              description: normalizeRichTextHtml(card?.description)
            }))
          : []
      }))
    : [];

  return {
    ...payload,
    lists
  };
};

/** 서버 moveList와 동일한 삽입 규칙으로 목록 순서만 미리 반영 */
const applyOptimisticListMove = (board: any, activeListId: number, targetIndex: number): any => {
  if (!board?.lists) return board;
  const sorted = [...board.lists].sort((a: BoardList, b: BoardList) => a.position - b.position);
  const moving = sorted.find((l) => l.id === activeListId);
  if (!moving) return board;
  const others = sorted.filter((l) => l.id !== activeListId);
  const insertAt = Math.min(Math.max(0, targetIndex), others.length);
  const next = [...others.slice(0, insertAt), moving, ...others.slice(insertAt)].map((l, i) => ({
    ...l,
    position: i
  }));
  return { ...board, lists: next };
};

/** 대분류에 담당자가 있으면 카드 업무 담당을 그 담당자로 맞춤 */
const resolveListAssigneeForCard = (
  list: BoardList | undefined | null
): BoardCard['assignee'] | undefined => {
  if (!list) return undefined;
  const aid = list.assignee_user_id != null ? Number(list.assignee_user_id) : null;
  if (aid == null || !Number.isFinite(aid) || aid <= 0) return undefined;
  if (list.assignee && Number(list.assignee.id) === aid) {
    return {
      id: aid,
      username: list.assignee.username || '',
      avatar_url: list.assignee.avatar_url
    };
  }
  return { id: aid, username: list.assignee?.username || '' };
};

/** 서버 moveCard와 동일하게 카드만 미리 옮김 — 성공 시 전체 리로드 없이 자연스러운 UX */
const applyOptimisticCardMove = (
  board: any,
  activeCardId: number,
  targetListId: number,
  targetIndex: number
): any => {
  if (!board?.lists) return board;
  const lists: BoardList[] = board.lists.map((list: BoardList) => ({
    ...list,
    cards: [...(list.cards || [])] as BoardCard[]
  }));

  let moved: BoardCard | null = null;
  let sourceListId: number | null = null;
  for (const l of lists) {
    const row = l.cards ?? [];
    const i = row.findIndex((c: BoardCard) => c.id === activeCardId);
    if (i >= 0) {
      moved = row[i];
      sourceListId = l.id;
      row.splice(i, 1);
      l.cards = row;
      break;
    }
  }
  if (!moved) return board;

  const target = lists.find((l: BoardList) => l.id === targetListId);
  if (!target) return board;

  let cardToInsert = moved;
  if (sourceListId !== targetListId) {
    const nextAssignee = resolveListAssigneeForCard(target);
    if (nextAssignee) {
      const prevAssigneeId = moved.assignee?.id != null ? Number(moved.assignee.id) : null;
      const nextRefs = new Set(
        (moved.reference_user_ids || [])
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0)
      );
      if (prevAssigneeId != null && prevAssigneeId !== nextAssignee.id) {
        nextRefs.add(prevAssigneeId);
      }
      nextRefs.delete(nextAssignee.id);
      cardToInsert = {
        ...moved,
        assignee: nextAssignee,
        reference_user_ids: Array.from(nextRefs)
      };
    }
  }

  const filtered = (target.cards ?? []).filter((c: BoardCard) => c.id !== activeCardId);
  const insertAt = Math.min(Math.max(0, targetIndex), filtered.length);
  filtered.splice(insertAt, 0, cardToInsert);
  target.cards = filtered;

  return { ...board, lists };
};

const applyCardMoveMetaOnBoard = (
  board: any,
  cardId: number,
  meta: {
    assignee?: { id: number; username?: string; avatar_url?: string | null } | null;
    reference_user_ids?: number[];
  }
): any => {
  if (!board?.lists) return board;
  return {
    ...board,
    lists: (board.lists as BoardList[]).map((list) => ({
      ...list,
      cards: (list.cards || []).map((c) => {
        if (c.id !== cardId) return c;
        const next: BoardCard = { ...c };
        if (meta.assignee !== undefined) {
          next.assignee = meta.assignee
            ? {
                id: Number(meta.assignee.id),
                username: meta.assignee.username || c.assignee?.username || '',
                avatar_url: meta.assignee.avatar_url ?? c.assignee?.avatar_url
              }
            : undefined;
        }
        if (meta.reference_user_ids !== undefined) {
          next.reference_user_ids = meta.reference_user_ids
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0);
        }
        return next;
      })
    }))
  };
};

/** 드롭 시 위치가 실제로 바뀌는지 판별 (불필요한 moveCard 방지) */
const findCardPositionInBoard = (boardData: any, cardId: number): { listId: number; index: number } | null => {
  if (!boardData?.lists) return null;
  for (const list of boardData.lists as BoardList[]) {
    const cards = list.cards || [];
    const index = cards.findIndex((c: BoardCard) => c.id === cardId);
    if (index >= 0) return { listId: list.id, index };
  }
  return null;
};

/** 카드: closestCorners(카드·리스트 droppable만), 대분류(열) 이동: closestCenter */
const kanbanCollisionDetection: CollisionDetection = (args) => {
  const activeId = String(args.active.id);

  if (activeId.startsWith('listcol-')) {
    const containers = args.droppableContainers.filter((c) => String(c.id).startsWith('listcol-'));
    return closestCenter({ ...args, droppableContainers: containers });
  }

  if (activeId.startsWith('card-')) {
    const containers = args.droppableContainers.filter((c) => {
      const id = String(c.id);
      return id.startsWith('card-') || id.startsWith('list-');
    });
    return closestCorners({ ...args, droppableContainers: containers });
  }

  return closestCorners(args);
};

function KanbanInlineTitle({
  title,
  descriptionPlain,
  titleFontSize = '0.8125rem',
  compact = false,
}: {
  title: string;
  descriptionPlain: string;
  titleFontSize?: string;
  /** 카드 면 — 제목만 표시(설명은 아이콘으로) */
  compact?: boolean;
}) {
  const hasDesc = Boolean(descriptionPlain) && !compact;
  const fullLabel = hasDesc || compact ? (descriptionPlain ? `${title} (${descriptionPlain})` : title) : title;
  return (
    <Typography
      component="div"
      variant="subtitle2"
      title={fullLabel}
      sx={{
        flexShrink: 0,
        minWidth: 0,
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        lineHeight: 1.45,
        fontSize: titleFontSize,
        letterSpacing: '-0.01em',
        fontWeight: 500,
        color: 'text.primary',
      }}
    >
      {compact ? (
        title || '\u00a0'
      ) : (
        <>
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {title || '\u00a0'}
          </Box>
          {hasDesc ? (
            <Box
              component="span"
              sx={{
                fontWeight: 400,
                color: 'text.secondary',
                fontSize: `calc(${titleFontSize} - 0.0625rem)`,
                ml: KANBAN_TITLE_DESC_GAP,
              }}
            >
              ({descriptionPlain})
            </Box>
          ) : null}
        </>
      )}
    </Typography>
  );
}

const getAvatarColor = (userId: number) => AVATAR_PALETTE[Math.abs(userId) % AVATAR_PALETTE.length];

const resolveUserAvatarSrc = (avatarUrl?: string | null) => {
  const resolved = getUploadUrl(avatarUrl);
  return resolved || undefined;
};

type BoardMemberLite = {
  user_id: number;
  user?: { id?: number; username?: string; avatar_url?: string | null };
};

function resolveCardFaceAvatars(card: BoardCard, members: BoardMemberLite[]) {
  const seen = new Set<number>();
  const avatars: { id: number; label: string; src?: string }[] = [];
  const push = (id?: number | null, label?: string, avatarUrl?: string | null) => {
    const uid = id != null ? Number(id) : 0;
    if (!uid || seen.has(uid)) return;
    seen.add(uid);
    avatars.push({
      id: uid,
      label: (label || '?').trim().charAt(0).toUpperCase() || '?',
      src: resolveUserAvatarSrc(avatarUrl),
    });
  };
  push(card.assignee?.id, card.assignee?.username, card.assignee?.avatar_url);
  (card.reference_user_ids || []).forEach((rid) => {
    const m = members.find((x) => Number(x.user_id) === Number(rid));
    push(rid, m?.user?.username, m?.user?.avatar_url);
  });
  return avatars.slice(0, 4);
}

function KanbanMetaIcon({
  icon,
  count,
}: {
  icon: React.ReactNode;
  count?: number;
}) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        color: KANBAN_META_ICON_COLOR,
        fontSize: '0.75rem',
        lineHeight: 1,
      }}
    >
      {icon}
      {count != null && count > 0 ? (
        <Box component="span" sx={{ fontSize: '0.6875rem', fontWeight: 600 }}>
          {count}
        </Box>
      ) : null}
    </Box>
  );
}

const DraggableCard = memo(function DraggableCard({
  card,
  onOpenDetail,
  dragDisabled,
  isCompletedList,
  members,
}: {
  card: BoardCard;
  onOpenDetail: (card: BoardCard) => void;
  dragDisabled?: boolean;
  isCompletedList?: boolean;
  members: BoardMemberLite[];
}) {
  const theme = useTheme();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card-${card.id}`,
    data: { card },
    disabled: Boolean(dragDisabled)
  });
  const { setNodeRef: setDropNodeRef } = useDroppable({
    id: `card-${card.id}`
  });

  const setCardNodeRef = (node: HTMLElement | null) => {
    setNodeRef(node);
    setDropNodeRef(node);
  };

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0 : 1,
        pointerEvents: isDragging ? ('none' as const) : undefined
      }
    : { opacity: isDragging ? 0 : 1, pointerEvents: isDragging ? ('none' as const) : undefined };

  const descPlain =
    card.description && !isRichTextEmpty(card.description) ? getPlainTextFromHtml(card.description) : '';

  const cardAccent = isHexColor(card.color) ? String(card.color) : null;
  const cardBg =
    theme.palette.mode === 'light' ? KANBAN_CARD_BG : alpha(theme.palette.grey[900], 0.88);
  const commentCount = card.comments?.length ?? 0;
  const referenceCount = card.reference_user_ids?.length ?? 0;
  const hasDesc = Boolean(descPlain);
  const faceAvatars = resolveCardFaceAvatars(card, members);
  const showMeta = hasDesc || commentCount > 0 || referenceCount > 0 || Boolean(card.due_date) || faceAvatars.length > 0;

  return (
    <Card
      ref={setCardNodeRef}
      elevation={0}
      data-kanban-card=""
      sx={{
        width: '100%',
        height: 'auto',
        minHeight: WORK_BOARD_CARD_MIN_HEIGHT_PX,
        display: 'flex',
        flexDirection: 'column',
        cursor: dragDisabled ? 'pointer' : 'grab',
        touchAction: 'pan-y',
        userSelect: 'none',
        bgcolor: cardBg,
        border: theme.palette.mode === 'light' ? KANBAN_CARD_BORDER : 'none',
        borderRadius: KANBAN_CARD_RADIUS,
        overflow: 'hidden',
        boxShadow: KANBAN_CARD_SHADOW,
        transition: isDragging ? 'none' : DRAG_LAYOUT_TRANSITION,
        willChange: isDragging ? 'transform' : 'auto',
        zIndex: isDragging ? 20 : 1,
        '&:hover': {
          boxShadow: KANBAN_CARD_HOVER_SHADOW,
        },
        ...style,
      }}
      {...(dragDisabled ? {} : listeners)}
      {...(dragDisabled ? {} : attributes)}
      onClick={() => {
        if (!isDragging) onOpenDetail(card);
      }}
    >
      {cardAccent ? (
        <Box sx={{ height: 6, flexShrink: 0, bgcolor: cardAccent }} />
      ) : null}
      <CardContent
        sx={{
          flex: 1,
          minHeight: 0,
          py: 1.15,
          px: 1.25,
          display: 'flex',
          flexDirection: 'column',
          gap: showMeta ? 0.85 : 0,
          overflow: 'hidden',
          '&:last-child': { pb: 1.15 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, minWidth: 0 }}>
          {isCompletedList ? (
            <CheckCircleIcon sx={{ fontSize: 18, color: '#36B37E', flexShrink: 0, mt: 0.1 }} />
          ) : null}
          <KanbanInlineTitle
            title={card.title || ''}
            descriptionPlain={descPlain}
            titleFontSize="0.8125rem"
            compact
          />
        </Box>
        {showMeta ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 0.75,
              flexShrink: 0,
              minHeight: 22,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
              {referenceCount > 0 ? (
                <KanbanMetaIcon
                  icon={<VisibilityOutlinedIcon sx={{ fontSize: 15 }} />}
                  count={referenceCount}
                />
              ) : null}
              {hasDesc ? (
                <KanbanMetaIcon icon={<NotesIcon sx={{ fontSize: 15 }} />} />
              ) : null}
              {commentCount > 0 ? (
                <KanbanMetaIcon
                  icon={<ChatBubbleOutlineIcon sx={{ fontSize: 15 }} />}
                  count={commentCount}
                />
              ) : null}
              {card.due_date ? (
                <Chip
                  size="small"
                  label={formatDueDate(card.due_date)}
                  sx={{
                    ...kanbanMetaChipSx,
                    height: 20,
                    fontSize: '0.625rem',
                    bgcolor: alpha('#FF5630', 0.12),
                    color: '#BF2600',
                  }}
                />
              ) : null}
            </Box>
            {faceAvatars.length > 0 ? (
              <AvatarGroup
                max={4}
                sx={{
                  flexShrink: 0,
                  '& .MuiAvatar-root': {
                    width: 24,
                    height: 24,
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    border: '2px solid #fff',
                  },
                }}
              >
                {faceAvatars.map((a) => (
                  <Avatar
                    key={a.id}
                    src={a.src}
                    alt={a.label}
                    sx={{ bgcolor: a.src ? 'transparent' : getAvatarColor(a.id) }}
                  >
                    {a.label}
                  </Avatar>
                ))}
              </AvatarGroup>
            ) : null}
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
});

const ListColumn = memo(function ListColumn({
  list,
  listTitleEditing,
  listTitleDraft,
  listSaving,
  composerOpen,
  composerTitle,
  composerDesc,
  onListTitleDraftChange,
  onStartEditListTitle,
  onOpenListSettings,
  onSaveListTitle,
  onDeleteList,
  onComposerTitleChange,
  onComposerDescChange,
  onOpenComposer,
  onCloseComposer,
  onSubmitCard,
  savingCard,
  onOpenCardDetail,
  txt,
  language,
  allowListReorder,
  allowListTitleEdit,
  allowListDelete,
  allowAddCard,
  members,
  isCompletedList,
}: {
  list: BoardList;
  listTitleEditing: boolean;
  listTitleDraft: string;
  listSaving: boolean;
  composerOpen: boolean;
  composerTitle: string;
  composerDesc: string;
  onListTitleDraftChange: (v: string) => void;
  onStartEditListTitle: (listId: number) => void;
  onOpenListSettings: (listId: number) => void;
  onSaveListTitle: () => void;
  onDeleteList: (listId: number, listTitle: string) => void;
  onComposerTitleChange: (v: string) => void;
  onComposerDescChange: (v: string) => void;
  onOpenComposer: (listId: number) => void;
  onCloseComposer: () => void;
  onSubmitCard: () => void;
  savingCard: boolean;
  onOpenCardDetail: (card: BoardCard, listTitle: string, listId: number) => void;
  txt: (ko: string, en: string) => string;
  language: 'ko' | 'en';
  allowListReorder: boolean;
  allowListTitleEdit: boolean;
  allowListDelete: boolean;
  allowAddCard: boolean;
  members: BoardMemberLite[];
  isCompletedList?: boolean;
}) {
  const theme = useTheme();
  const [listMenuAnchor, setListMenuAnchor] = useState<null | HTMLElement>(null);
  const { setNodeRef: setCardDropRef, isOver } = useDroppable({ id: `list-${list.id}` });
  const { setNodeRef: setListDropRef } = useDroppable({ id: `listcol-${list.id}` });
  const {
    attributes: listDragAttributes,
    listeners: listDragListeners,
    setNodeRef: setListDragRef,
    transform: listTransform,
    isDragging: isListDragging
  } = useDraggable({
    id: `listcol-${list.id}`,
    data: { listId: list.id },
    disabled: !allowListReorder
  });
  const cards = list.cards || [];

  const handleOpenCard = useCallback(
    (card: BoardCard) => onOpenCardDetail(card, list.title, list.id),
    [onOpenCardDetail, list.title, list.id]
  );

  const setColumnRef = (node: HTMLElement | null) => {
    setCardDropRef(node);
    setListDropRef(node);
    setListDragRef(node);
  };

  const listStyle = listTransform
    ? {
        transform: `translate3d(${listTransform.x}px, ${listTransform.y}px, 0)`,
        opacity: isListDragging ? 0 : 1,
        pointerEvents: isListDragging ? ('none' as const) : undefined
      }
    : { opacity: isListDragging ? 0 : 1, pointerEvents: isListDragging ? ('none' as const) : undefined };

  return (
    <Paper
      ref={setColumnRef}
      elevation={0}
      data-kanban-column=""
      sx={{
        boxSizing: 'border-box',
        flex: `0 0 ${WORK_BOARD_COLUMN_WIDTH_PX}px`,
        width: `${WORK_BOARD_COLUMN_WIDTH_PX}px`,
        minWidth: WORK_BOARD_COLUMN_WIDTH_PX,
        maxWidth: `${WORK_BOARD_COLUMN_WIDTH_PX}px`,
        bgcolor: theme.palette.mode === 'light' ? KANBAN_COLUMN_BG : alpha(theme.palette.common.black, 0.22),
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        outline: isOver ? '2px solid' : 'none',
        outlineColor: alpha(theme.palette.primary.main, 0.45),
        outlineOffset: 0,
        p: 1.25,
        borderRadius: KANBAN_COLUMN_RADIUS,
        border: theme.palette.mode === 'light' ? KANBAN_COLUMN_BORDER : 'none',
        boxShadow: theme.palette.mode === 'light' ? KANBAN_COLUMN_SHADOW : 'none',
        alignSelf: 'flex-start',
        minHeight: 120,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
        transition: isListDragging ? 'none' : DRAG_TRANSITION,
        willChange: isListDragging ? 'transform' : 'auto',
        zIndex: isListDragging ? 10 : 1,
        ...listStyle,
      }}
    >
      <Box
        data-kanban-list-handle=""
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          mb: 1,
          px: 0.15,
          flexShrink: 0,
          cursor: allowListReorder ? 'grab' : 'default',
        }}
        {...(allowListReorder ? listDragAttributes : {})}
        {...(allowListReorder ? listDragListeners : {})}
      >
        {listTitleEditing && allowListTitleEdit ? (
          <TextField
            autoFocus
            hiddenLabel
            size="small"
            value={listTitleDraft}
            onChange={(e) => onListTitleDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSaveListTitle();
              }
            }}
            sx={{ flex: 1 }}
          />
        ) : (
          <>
            <Typography
              component="span"
              sx={{
                fontWeight: 700,
                fontSize: '0.875rem',
                color: '#172B4D',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0,
              }}
              title={displayBoardListTitle(list.title, language)}
            >
              {displayBoardListTitle(list.title, language)}
            </Typography>
            <Typography
              component="span"
              sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#6B778C', flexShrink: 0 }}
            >
              {cards.length}
            </Typography>
          </>
        )}
        {listTitleEditing && allowListTitleEdit ? (
          <IconButton
            size="small"
            onClick={onSaveListTitle}
            disabled={listSaving || !listTitleDraft.trim()}
            aria-label={txt('제목 저장', 'Save title')}
          >
            <CheckIcon fontSize="small" />
          </IconButton>
        ) : (allowListTitleEdit || allowListDelete) ? (
          <>
            <IconButton
              size="small"
              aria-label={txt('대분류 메뉴', 'List menu')}
              onClick={(e) => setListMenuAnchor(e.currentTarget)}
              sx={{ color: '#6B778C', borderRadius: KANBAN_CONTROL_RADIUS }}
            >
              <MoreHorizIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={listMenuAnchor}
              open={Boolean(listMenuAnchor)}
              onClose={() => setListMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              {allowListTitleEdit ? (
                <MenuItem
                  onClick={() => {
                    setListMenuAnchor(null);
                    onStartEditListTitle(list.id);
                  }}
                >
                  <EditOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                  {txt('제목 수정', 'Edit title')}
                </MenuItem>
              ) : null}
              {allowListTitleEdit ? (
                <MenuItem
                  onClick={() => {
                    setListMenuAnchor(null);
                    onOpenListSettings(list.id);
                  }}
                >
                  <PersonAddIcon fontSize="small" sx={{ mr: 1 }} />
                  {txt('대분류 설정', 'List settings')}
                </MenuItem>
              ) : null}
              {allowListDelete ? (
                <MenuItem
                  onClick={() => {
                    setListMenuAnchor(null);
                    onDeleteList(list.id, list.title);
                  }}
                  sx={{ color: 'error.main' }}
                >
                  <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                  {txt('대분류 삭제', 'Delete list')}
                </MenuItem>
              ) : null}
            </Menu>
          </>
        ) : null}
      </Box>
      {!listTitleEditing && (list.assignee?.username || list.assignee_user_id) ? (
        <Typography
          sx={{
            px: 1,
            pb: 0.75,
            fontSize: '0.75rem',
            color: '#6B778C',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={list.assignee?.username || String(list.assignee_user_id)}
        >
          {txt('대분류 담당', 'List owner')}:{' '}
          {list.assignee?.username || `${txt('사용자', 'User')} ${list.assignee_user_id}`}
        </Typography>
      ) : null}
      <Box
        sx={{
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {cards.map((c) => (
          <DraggableCard
            key={c.id}
            card={c}
            members={members}
            isCompletedList={isCompletedList}
            onOpenDetail={handleOpenCard}
            dragDisabled={!allowListReorder}
          />
        ))}
      </Box>

      {allowAddCard && composerOpen ? (
        <Paper
          elevation={0}
          sx={{
            mt: 0.5,
            p: 1.25,
            bgcolor: KANBAN_CARD_BG,
            borderRadius: KANBAN_CARD_RADIUS,
            border: KANBAN_CARD_BORDER,
            boxShadow: KANBAN_CARD_SHADOW,
          }}
        >
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={2}
            maxRows={6}
            size="small"
            placeholder={txt('제목', 'Title')}
            value={composerTitle}
            onChange={(e) => onComposerTitleChange(e.target.value)}
            variant="outlined"
            hiddenLabel
            sx={{ mb: 1 }}
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={8}
            size="small"
            placeholder={txt('설명 (선택)', 'Description (optional)')}
            value={composerDesc}
            onChange={(e) => onComposerDescChange(e.target.value)}
            variant="outlined"
            hiddenLabel
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Button
              size="small"
              variant="contained"
              onClick={onSubmitCard}
              disabled={savingCard || !composerTitle.trim()}
              sx={{ textTransform: 'none', borderRadius: KANBAN_CONTROL_RADIUS, fontWeight: 600, boxShadow: 'none' }}
            >
              {savingCard ? <CircularProgress size={18} color="inherit" /> : txt('카드 추가', 'Add Card')}
            </Button>
            <IconButton size="small" onClick={onCloseComposer} aria-label={txt('취소', 'Cancel')} sx={{ borderRadius: KANBAN_CONTROL_RADIUS }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      ) : allowAddCard ? (
        <Button
          fullWidth
          size="small"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={() => onOpenComposer(list.id)}
          sx={{
            mt: 0.75,
            justifyContent: 'flex-start',
            color: '#5E6C84',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.8125rem',
            py: 0.85,
            px: 1,
            borderRadius: KANBAN_CONTROL_RADIUS,
            bgcolor: 'transparent',
            '&:hover': { bgcolor: '#E6EDF5', color: '#172B4D' },
          }}
        >
          {txt('카드 추가', 'Add a card')}
        </Button>
      ) : null}
    </Paper>
  );
});

const WorkBoardDetailPage: React.FC = () => {
  const theme = useTheme();
  const { boardId: boardIdParam } = useParams();
  const boardId = Number(boardIdParam);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkCardHandledRef = useRef<number | null>(null);
  const { user } = useStore();
  const { language, menus, hasMenuPermission } = useMenuStore();
  const { t, i18n } = useTranslation();
  const txt = useCallback(
    (ko: string, en: string) => {
      const lang = String(i18n.language || language || 'ko').toLowerCase();
      return lang.startsWith('en') ? en : ko;
    },
    [i18n.language, language]
  );
  const workProjectsMenuId = useMemo(
    () => findMenuIdByPath(menus, location.pathname),
    [menus, location.pathname]
  );
  const isRootUser = user?.role === 'root';
  const menuCanCreate =
    isRootUser || (workProjectsMenuId != null && hasMenuPermission(workProjectsMenuId, 'create'));
  const menuCanEdit =
    isRootUser || (workProjectsMenuId != null && hasMenuPermission(workProjectsMenuId, 'edit'));
  const menuCanDelete =
    isRootUser || (workProjectsMenuId != null && hasMenuPermission(workProjectsMenuId, 'delete'));
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const photoPreview = usePhotoPreviewOptional();

  const [board, setBoard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);
  const [activeList, setActiveList] = useState<BoardList | null>(null);

  /** 트렐로식 인라인 작성기가 열린 리스트 id */
  const [composerListId, setComposerListId] = useState<number | null>(null);
  const [composerTitle, setComposerTitle] = useState('');
  const [composerDesc, setComposerDesc] = useState('');
  const [savingCard, setSavingCard] = useState(false);
  const [editingListId, setEditingListId] = useState<number | null>(null);
  const [editingListTitle, setEditingListTitle] = useState('');
  const [listSaving, setListSaving] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListAssigneeUserId, setNewListAssigneeUserId] = useState<number | null>(null);
  const [creatingList, setCreatingList] = useState(false);
  const [addListOpen, setAddListOpen] = useState(false);
  const [listSettingsOpen, setListSettingsOpen] = useState(false);
  const [listSettingsId, setListSettingsId] = useState<number | null>(null);
  const [listSettingsDescription, setListSettingsDescription] = useState('');
  const [listSettingsAssigneeUserId, setListSettingsAssigneeUserId] = useState<number | null>(null);
  const [listSettingsSaving, setListSettingsSaving] = useState(false);
  const [completedTasksOpen, setCompletedTasksOpen] = useState(false);
  const [completedTaskSearch, setCompletedTaskSearch] = useState('');
  const [completedTaskPage, setCompletedTaskPage] = useState(1);
  const [cardSearch, setCardSearch] = useState('');
  const [reopeningCardId, setReopeningCardId] = useState<number | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [memberRemovingId, setMemberRemovingId] = useState<number | null>(null);
  const [memberMenuAnchor, setMemberMenuAnchor] = useState<HTMLElement | null>(null);
  const [memberMenuTarget, setMemberMenuTarget] = useState<any | null>(null);
  const [cardDetail, setCardDetail] = useState<CardDetailState | null>(null);
  const [cardSaving, setCardSaving] = useState(false);
  const [cardComments, setCardComments] = useState<BoardCardComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<number[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionHighlightIndex, setMentionHighlightIndex] = useState(0);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentDeletingId, setCommentDeletingId] = useState<number | null>(null);
  const [replyParentId, setReplyParentId] = useState<number | null>(null);
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  /** 칸반 인라인으로 마지막 생성된 카드 id — 세부 화면에서 한 번 저장하기 전까지 댓글 잠금 */
  const lastQuickCreatedCardIdRef = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 0 }
    })
  );

  const loadBoard = useCallback(async (options?: { silent?: boolean }) => {
    if (!boardId || Number.isNaN(boardId)) return;
    const silent = options?.silent === true;
    if (!silent) setLoading(true);
    try {
      const res = await workBoardService.getBoard(boardId, { light: true });
      if (res.success) {
        setBoard(normalizeBoardData(res.data));
      } else {
        showErrorPopup(res.message || '불러올 수 없습니다.', '작업 보드');
      }
    } catch (e: any) {
      showErrorPopup(e, '작업 보드');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const loadUsers = useCallback(async () => {
    const boardCompanyId =
      board?.company_id != null && board.company_id !== '' ? Number(board.company_id) : NaN;
    if (!Number.isInteger(boardCompanyId) || boardCompanyId <= 0) {
      setCompanyUsers([]);
      return;
    }
    const boardTenantId =
      board?.tenant_id != null && board.tenant_id !== '' ? Number(board.tenant_id) : null;
    try {
      const params: Record<string, string> = {};
      if ((user?.role === 'root' || user?.role === 'audit') && boardCompanyId > 0) {
        params.company_id = String(boardCompanyId);
      }
      const allUsers = await useReferenceDataStore.getState().fetchUsers(
        params.company_id ? { company_id: Number(params.company_id) } : undefined
      );
      const list = filterActiveCompanyUsers(allUsers, {
        companyId: boardCompanyId,
        tenantId: boardTenantId,
        excludeUserId: user?.id != null ? Number(user.id) : undefined,
      });
      setCompanyUsers(list);
    } catch {
      /* ignore */
    }
  }, [board?.company_id, board?.tenant_id, user?.id, user?.role]);

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    const boardLists: BoardList[] = board?.lists || [];
    if (id.startsWith('card-')) {
      setActiveList(null);
      const cid = parseInt(id.replace('card-', ''), 10);
      for (const l of boardLists) {
        const c = (l.cards || []).find((x) => x.id === cid);
        if (c) {
          setActiveCard(c);
          return;
        }
      }
      setActiveCard(null);
      return;
    }
    if (id.startsWith('listcol-')) {
      setActiveCard(null);
      const lid = parseInt(id.replace('listcol-', ''), 10);
      const col = boardLists.find((l) => l.id === lid);
      setActiveList(col || null);
      return;
    }
    setActiveCard(null);
    setActiveList(null);
  };

  const handleDragCancel = () => {
    setActiveCard(null);
    setActiveList(null);
  };

  const isKanbanDragging = Boolean(activeCard || activeList);
  const boardHScrollRef = useRef<HTMLDivElement | null>(null);
  const boardPanRef = useRef<{
    active: boolean;
    pointerId: number | null;
    lastX: number;
    lastY: number;
    moved: boolean;
  }>({ active: false, pointerId: null, lastX: 0, lastY: 0, moved: false });
  const [boardPanning, setBoardPanning] = useState(false);

  const canStartBoardPan = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    if (target.closest(BOARD_PAN_IGNORE_SELECTOR)) {
      return false;
    }
    return true;
  }, []);

  const endBoardPan = useCallback((pointerId?: number) => {
    if (pointerId != null && boardPanRef.current.pointerId !== pointerId) return;
    boardPanRef.current.active = false;
    boardPanRef.current.pointerId = null;
    boardPanRef.current.moved = false;
    setBoardPanning(false);
    document.body.style.removeProperty('user-select');
    document.body.style.removeProperty('cursor');
  }, []);

  const handleBoardPanPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 || isKanbanDragging) return;
      if (!canStartBoardPan(e.target)) return;
      boardPanRef.current = {
        active: true,
        pointerId: e.pointerId,
        lastX: e.clientX,
        lastY: e.clientY,
        moved: false,
      };
      setBoardPanning(true);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [canStartBoardPan, isKanbanDragging]
  );

  const handleBoardPanPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!boardPanRef.current.active || boardPanRef.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - boardPanRef.current.lastX;
    const dy = e.clientY - boardPanRef.current.lastY;
    if (!boardPanRef.current.moved && Math.abs(dx) + Math.abs(dy) < 2) return;
    boardPanRef.current.moved = true;
    boardPanRef.current.lastX = e.clientX;
    boardPanRef.current.lastY = e.clientY;
    // 좌우: 칸반 가로 스크롤 컨테이너 / 상하: 브라우저 스크롤
    const hScroll = boardHScrollRef.current;
    if (hScroll && dx !== 0) {
      hScroll.scrollLeft -= dx;
    }
    if (dy !== 0) {
      window.scrollBy(0, -dy);
    }
  }, []);

  const handleBoardPanPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      endBoardPan(e.pointerId);
    },
    [endBoardPan]
  );

  useEffect(() => {
    if (!isKanbanDragging) return;
    endBoardPan();
  }, [isKanbanDragging, endBoardPan]);

  useEffect(() => {
    if (!isKanbanDragging) return;
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    if (!isCoarsePointer) {
      return;
    }
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isKanbanDragging]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const clearDragOverlay = () => {
      setActiveCard(null);
      setActiveList(null);
    };

    if (!menuCanEdit) {
      clearDragOverlay();
      return;
    }
    const { active, over } = event;
    if (!over || !board) {
      clearDragOverlay();
      return;
    }

    const activeIdStr = String(active.id);
    const overId = String(over.id);
    const lists: BoardList[] = board.lists || [];

    // 대분류(컬럼) 드래그 이동
    if (activeIdStr.startsWith('listcol-')) {
      const activeListId = parseInt(activeIdStr.replace('listcol-', ''), 10);
      let targetListId: number | null = null;

      if (overId.startsWith('listcol-')) {
        targetListId = parseInt(overId.replace('listcol-', ''), 10);
      } else if (overId.startsWith('list-')) {
        targetListId = parseInt(overId.replace('list-', ''), 10);
      } else if (overId.startsWith('card-')) {
        const overCardId = parseInt(overId.replace('card-', ''), 10);
        for (const l of lists) {
          if ((l.cards || []).some((c) => c.id === overCardId)) {
            targetListId = l.id;
            break;
          }
        }
      }

      if (!targetListId || targetListId === activeListId) {
        clearDragOverlay();
        return;
      }
      const orderedLists = [...lists].sort((a, b) => a.position - b.position);
      const targetIndex = orderedLists.findIndex((l) => l.id === targetListId);
      if (targetIndex < 0) {
        clearDragOverlay();
        return;
      }

      const prevBoard = board;
      setBoard((p: any) => applyOptimisticListMove(p, activeListId, targetIndex));
      clearDragOverlay();
      try {
        const res = await workBoardService.moveList(boardId, activeListId, targetIndex);
        if (!res.success) {
          setBoard(prevBoard);
          showErrorPopup(res.message || '대분류 이동 실패', '작업 보드');
        }
      } catch (e: any) {
        setBoard(prevBoard);
        showErrorPopup(e, '작업 보드');
      }
      return;
    }

    if (!activeIdStr.startsWith('card-')) {
      clearDragOverlay();
      return;
    }
    const activeCardId = parseInt(activeIdStr.replace('card-', ''), 10);

    if (overId.startsWith('card-')) {
      const overCardIdEarly = parseInt(overId.replace('card-', ''), 10);
      if (overCardIdEarly === activeCardId) {
        clearDragOverlay();
        return;
      }
    }

    let targetListId: number;
    let targetIndex: number;

    if (overId.startsWith('list-')) {
      targetListId = parseInt(overId.replace('list-', ''), 10);
      const list = lists.find((l) => l.id === targetListId);
      const filtered = (list?.cards || []).filter((c) => c.id !== activeCardId);
      targetIndex = filtered.length;
    } else if (overId.startsWith('card-')) {
      const overCardId = parseInt(overId.replace('card-', ''), 10);
      let found: BoardList | undefined;
      for (const l of lists) {
        if ((l.cards || []).some((c) => c.id === overCardId)) {
          found = l;
          break;
        }
      }
      if (!found) {
        clearDragOverlay();
        return;
      }
      targetListId = found.id;
      const filtered = (found.cards || []).filter((c) => c.id !== activeCardId);
      const idx = filtered.findIndex((c) => c.id === overCardId);
      targetIndex = idx >= 0 ? idx : filtered.length;
    } else {
      clearDragOverlay();
      return;
    }

    const before = findCardPositionInBoard(board, activeCardId);
    if (
      before &&
      before.listId === targetListId &&
      before.index === targetIndex
    ) {
      clearDragOverlay();
      return;
    }

    const prevBoard = board;
    setBoard((p: any) => applyOptimisticCardMove(p, activeCardId, targetListId, targetIndex));
    clearDragOverlay();
    try {
      const res = await workBoardService.moveCard(boardId, activeCardId, targetListId, targetIndex);
      if (!res.success) {
        setBoard(prevBoard);
        showErrorPopup(res.message || '이동 실패', '작업 보드');
        return;
      }
      if (res.data?.assignee || res.data?.reference_user_ids) {
        setBoard((p: any) =>
          applyCardMoveMetaOnBoard(p, activeCardId, {
            assignee: res.data?.assignee,
            reference_user_ids: res.data?.reference_user_ids
          })
        );
      }
    } catch (e: any) {
      setBoard(prevBoard);
      showErrorPopup(e, '작업 보드');
    }
  };

  const startEditListTitleById = useCallback(
    (listId: number) => {
      if (!menuCanEdit) return;
      const list = (board?.lists || []).find((l: BoardList) => l.id === listId);
      if (list) {
        setEditingListId(list.id);
        setEditingListTitle(list.title);
      }
    },
    [board?.lists, menuCanEdit]
  );

  const openListSettingsById = useCallback(
    (listId: number) => {
      if (!menuCanEdit) return;
      const list = (board?.lists || []).find((l: BoardList) => l.id === listId);
      if (!list) return;
      setListSettingsId(list.id);
      setListSettingsDescription(list.description || '');
      setListSettingsAssigneeUserId(
        list.assignee_user_id != null
          ? Number(list.assignee_user_id)
          : list.assignee?.id != null
            ? Number(list.assignee.id)
            : null
      );
      setListSettingsOpen(true);
    },
    [board?.lists, menuCanEdit]
  );

  const saveListSettings = useCallback(async () => {
    if (!listSettingsId) return;
    if (!menuCanEdit) {
      showErrorPopup(
        txt('대분류를 수정할 권한이 없습니다.', 'You do not have permission to edit lists.'),
        txt('업무 보드', 'Work board')
      );
      return;
    }
    setListSettingsSaving(true);
    try {
      const res = await workBoardService.updateList(boardId, listSettingsId, {
        description: listSettingsDescription.trim() || null,
        assignee_user_id: listSettingsAssigneeUserId
      });
      if (!res.success) {
        showErrorPopup(res.message || txt('대분류 설정 저장 실패', 'Failed to save list settings.'), txt('업무 보드', 'Work board'));
        return;
      }
      const cascadedCount = Number(res.meta?.cascaded_card_count || 0);
      setListSettingsOpen(false);
      setListSettingsId(null);
      await loadBoard();
      if (cascadedCount > 0) {
        showSuccessToast(
          txt(
            `대분류 담당자가 변경되어 하위 카드 ${cascadedCount}건의 담당자를 갱신했습니다.`,
            `List owner updated; assignee refreshed on ${cascadedCount} card(s).`
          )
        );
      } else {
        showSuccessToast(txt('대분류 설정이 저장되었습니다.', 'List settings saved.'));
      }
    } catch (error: any) {
      showErrorPopup(error, txt('업무 보드', 'Work board'));
    } finally {
      setListSettingsSaving(false);
    }
  }, [
    boardId,
    listSettingsAssigneeUserId,
    listSettingsDescription,
    listSettingsId,
    loadBoard,
    menuCanEdit,
    txt
  ]);

  const saveListTitle = useCallback(async () => {
    if (!editingListId) return;
    if (!menuCanEdit) {
      showErrorPopup(
        txt('대분류를 수정할 권한이 없습니다.', 'You do not have permission to edit lists.'),
        txt('업무 보드', 'Work board')
      );
      return;
    }
    if (!editingListTitle.trim()) {
      showErrorPopup('대분류 제목을 입력해주세요.', '업무 보드');
      return;
    }
    setListSaving(true);
    try {
      const res = await workBoardService.updateList(boardId, editingListId, {
        title: editingListTitle.trim()
      });
      if (!res.success) {
        showErrorPopup(res.message || '대분류 제목 저장 실패', '업무 보드');
        return;
      }
      setEditingListId(null);
      setEditingListTitle('');
      await loadBoard();
    } catch (error: any) {
      showErrorPopup(error, '업무 보드');
    } finally {
      setListSaving(false);
    }
  }, [boardId, editingListId, editingListTitle, loadBoard, menuCanEdit, txt]);

  const deleteList = useCallback(
    async (listId: number, listTitle: string) => {
      if (!menuCanDelete) {
        showErrorPopup(
          txt('대분류를 삭제할 권한이 없습니다.', 'You do not have permission to delete lists.'),
          txt('업무 보드', 'Work board')
        );
        return;
      }
      showConfirm(
        txt(
          `"${listTitle}" 대분류와 하위 카드를 삭제하시겠습니까?`,
          `Delete the list "${displayBoardListTitle(listTitle, 'en')}" and all cards in it?`
        ),
        () => {
          void (async () => {
            try {
              const res = await workBoardService.deleteList(boardId, listId);
              if (res.success) {
                showSuccessToast(txt('대분류가 삭제되었습니다.', 'List deleted.'));
                if (editingListId === listId) {
                  setEditingListId(null);
                  setEditingListTitle('');
                }
                await loadBoard();
              } else {
                showErrorPopup(res.message || txt('대분류 삭제 실패', 'Failed to delete list.'), txt('업무 보드', 'Work board'));
              }
            } catch (error: any) {
              showErrorPopup(error, txt('업무 보드', 'Work board'));
            }
          })();
        },
        {
          title: txt('대분류 삭제', 'Delete list'),
          confirmText: txt('삭제', 'Delete'),
          confirmColor: 'error'
        }
      );
    },
    [boardId, showConfirm, editingListId, loadBoard, txt, menuCanDelete]
  );

  const createNewList = async () => {
    if (!menuCanCreate) {
      showErrorPopup(
        txt('대분류를 추가할 권한이 없습니다.', 'You do not have permission to add lists.'),
        txt('업무 보드', 'Work board')
      );
      return;
    }
    if (!newListTitle.trim()) {
      showErrorPopup('대분류 제목을 입력해주세요.', '업무 보드');
      return;
    }
    setCreatingList(true);
    try {
      const res = await workBoardService.createList(boardId, {
        title: newListTitle.trim(),
        description: newListDescription.trim() || null,
        assignee_user_id: newListAssigneeUserId
      });
      if (!res.success) {
        showErrorPopup(res.message || '대분류 추가 실패', '업무 보드');
        return;
      }
      setNewListTitle('');
      setNewListDescription('');
      setNewListAssigneeUserId(null);
      setAddListOpen(false);
      await loadBoard();
    } catch (error: any) {
      showErrorPopup(error, '업무 보드');
    } finally {
      setCreatingList(false);
    }
  };

  const openCardDetail = useCallback((card: BoardCard, listTitle: string, listId: number) => {
    const blockCommentsUntilDetailSave =
      lastQuickCreatedCardIdRef.current != null &&
      Number(card.id) === Number(lastQuickCreatedCardIdRef.current);
    setCardDetail({
      cardId: card.id,
      blockCommentsUntilDetailSave,
      title: card.title || '',
      description: normalizeRichTextHtml(card.description),
      dueDate: formatDueDate(card.due_date),
      color: card.color || '',
      assigneeUserId: card.assignee?.id ?? null,
      referenceUserIds: Array.isArray(card.reference_user_ids)
        ? card.reference_user_ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
        : [],
      createdBy: card.created_by != null ? Number(card.created_by) : null,
      listId,
      originalListId: listId,
      listTitle
    });
    setCardComments(sortBoardCardCommentsThreaded(card.comments || []));
    setNewComment('');
    setReplyParentId(null);
    setMentionedUserIds([]);
    setMentionOpen(false);
    setMentionQuery('');
    setMentionHighlightIndex(0);
  }, []);

  /** 알림 딥링크(?card=)로 진입 시 해당 카드 상세를 자동으로 연다 */
  useEffect(() => {
    if (!board?.lists || loading) return;
    const rawCardId = searchParams.get('card');
    if (!rawCardId) {
      deepLinkCardHandledRef.current = null;
      return;
    }
    const cardId = Number(rawCardId);
    if (!Number.isInteger(cardId) || cardId <= 0) return;
    if (deepLinkCardHandledRef.current === cardId) return;
    if (cardDetail?.cardId === cardId) {
      deepLinkCardHandledRef.current = cardId;
      return;
    }

    for (const list of board.lists as BoardList[]) {
      const card = (list.cards || []).find((c) => Number(c.id) === cardId);
      if (card) {
        deepLinkCardHandledRef.current = cardId;
        openCardDetail(card, list.title, list.id);
        const next = new URLSearchParams(searchParams);
        next.delete('card');
        setSearchParams(next, { replace: true });
        return;
      }
    }
  }, [board, loading, searchParams, cardDetail?.cardId, openCardDetail, setSearchParams]);

  const submitCard = useCallback(async () => {
    if (!composerListId || !composerTitle.trim()) return;
    if (!menuCanCreate) {
      showErrorPopup(
        txt('카드를 추가할 권한이 없습니다.', 'You do not have permission to add cards.'),
        txt('업무 보드', 'Work board')
      );
      return;
    }
    setSavingCard(true);
    try {
      const res = await workBoardService.createCard(boardId, composerListId, {
        title: composerTitle.trim(),
        description: composerDesc.trim() || undefined
      });
      if (res.success) {
        const payload = res.data as { id?: number } | undefined;
        const newId = Number(payload?.id);
        const savedListId = composerListId;
        const savedTitle = composerTitle.trim();
        const savedDesc = composerDesc.trim();
        setComposerListId(null);
        setComposerTitle('');
        setComposerDesc('');
        if (Number.isInteger(newId) && newId > 0) {
          lastQuickCreatedCardIdRef.current = newId;
          const list = (board?.lists || []).find((l: BoardList) => l.id === savedListId);
          openCardDetail(
            {
              id: newId,
              title: savedTitle,
              description: savedDesc || undefined,
              position: 0,
              comments: []
            },
            list?.title ?? '',
            savedListId
          );
          await loadBoard({ silent: true });
        } else {
          await loadBoard();
        }
      } else {
        showErrorPopup(res.message || '실패', '작업 보드');
      }
    } catch (e: any) {
      showErrorPopup(e, '작업 보드');
    } finally {
      setSavingCard(false);
    }
  }, [board, boardId, composerListId, composerTitle, composerDesc, loadBoard, menuCanCreate, openCardDetail, txt]);

  const openComposer = useCallback(
    (listId: number) => {
      if (!menuCanCreate) return;
      setComposerListId(listId);
      setComposerTitle('');
      setComposerDesc('');
    },
    [menuCanCreate]
  );

  const closeComposer = useCallback(() => {
    setComposerListId(null);
    setComposerTitle('');
    setComposerDesc('');
  }, []);

  const loadCardComments = useCallback(
    async (cardId: number) => {
      setCommentLoading(true);
      try {
        const res = await workBoardService.getCardComments(boardId, cardId);
        if (res.success) {
          setCardComments(sortBoardCardCommentsThreaded(res.data || []));
        }
      } catch (e: any) {
        showErrorPopup(e, '카드 댓글');
      } finally {
        setCommentLoading(false);
      }
    },
    [boardId]
  );

  useEffect(() => {
    if (!cardDetail?.cardId) return;
    if (cardDetail.blockCommentsUntilDetailSave) return;
    loadCardComments(cardDetail.cardId);
  }, [cardDetail?.cardId, cardDetail?.blockCommentsUntilDetailSave, loadCardComments]);

  const submitComment = async () => {
    if (!cardDetail?.cardId || !newComment.trim()) return;
    if (cardDetail.blockCommentsUntilDetailSave) return;
    if (!menuCanEdit) return;
    setCommentSaving(true);
    try {
      const content = newComment.trim();
      const mentionTokens = Array.from(content.matchAll(/@([^\s@]+)/g)).map((match) => match[1].toLowerCase());
      const mentionFromText = memberOptions
        .filter((member) => {
          const usernameToken = member.label.replace(/\s+/g, '').toLowerCase();
          return mentionTokens.includes(member.userid.toLowerCase()) || mentionTokens.includes(usernameToken);
        })
        .map((member) => member.id);
      const mentionUserIds = Array.from(
        new Set([...mentionedUserIds, ...mentionFromText].filter((id) => id !== Number(user?.id || 0)))
      );

      const res = await workBoardService.createCardComment(
        boardId,
        cardDetail.cardId,
        content,
        mentionUserIds,
        replyParentId ?? undefined
      );
      if (res.success) {
        await loadCardComments(cardDetail.cardId);
        setNewComment('');
        setReplyParentId(null);
        setMentionedUserIds([]);
        setMentionOpen(false);
        setMentionQuery('');
        setMentionHighlightIndex(0);
      } else {
        showErrorPopup(res.message || '댓글 등록 실패', '카드 댓글');
      }
    } catch (e: any) {
      showErrorPopup(e, '카드 댓글');
    } finally {
      setCommentSaving(false);
    }
  };

  const removeComment = async (commentId: number) => {
    if (!cardDetail?.cardId) return;
    if (!menuCanEdit) return;
    setCommentDeletingId(commentId);
    try {
      const res = await workBoardService.deleteCardComment(boardId, cardDetail.cardId, commentId);
      if (res.success) {
        await loadCardComments(cardDetail.cardId);
        setReplyParentId((prev) => (prev === commentId ? null : prev));
      } else {
        showErrorPopup(res.message || '댓글 삭제 실패', '카드 댓글');
      }
    } catch (e: any) {
      showErrorPopup(e, '카드 댓글');
    } finally {
      setCommentDeletingId(null);
    }
  };

  const closeCardDetail = () => {
    setCardDetail(null);
    setCardComments([]);
    setNewComment('');
    setReplyParentId(null);
    setMentionedUserIds([]);
    setMentionOpen(false);
    setMentionQuery('');
    setMentionHighlightIndex(0);
  };

  const persistCardDetail = async (forcedListId?: number, successMessage?: string) => {
    if (!cardDetail) return;
    if (!menuCanEdit) {
      showErrorPopup(
        txt('카드를 수정할 권한이 없습니다.', 'You do not have permission to edit cards.'),
        txt('카드 세부사항', 'Card details')
      );
      return;
    }
    if (!cardDetail.title.trim()) {
      showErrorPopup('제목은 필수입니다.', '카드 세부사항');
      return;
    }

    const targetListId = forcedListId ?? cardDetail.listId;
    const descriptionForSave = cardDetail.description;
    setCardSaving(true);
    try {
      const updateRes = await workBoardService.updateCard(boardId, cardDetail.cardId, {
        title: cardDetail.title.trim(),
        description: isRichTextEmpty(descriptionForSave) ? null : descriptionForSave,
        assignee_user_id: cardDetail.assigneeUserId,
        reference_user_ids: cardDetail.referenceUserIds,
        due_date: cardDetail.dueDate || null,
        color: cardDetail.color || null
      });

      if (!updateRes.success) {
        showErrorPopup(updateRes.message || '카드 저장에 실패했습니다.', '카드 세부사항');
        return;
      }

      if (targetListId !== cardDetail.originalListId) {
        const targetList = (board?.lists || []).find((l: BoardList) => l.id === targetListId);
        const targetIndex = targetList?.cards?.length ?? 0;
        const moveRes = await workBoardService.moveCard(
          boardId,
          cardDetail.cardId,
          targetListId,
          targetIndex
        );
        if (!moveRes.success) {
          showErrorPopup(moveRes.message || '목록 이동에 실패했습니다.', '카드 세부사항');
          return;
        }
      }

      await loadBoard();
      if (
        lastQuickCreatedCardIdRef.current != null &&
        lastQuickCreatedCardIdRef.current === Number(cardDetail.cardId)
      ) {
        lastQuickCreatedCardIdRef.current = null;
      }
      if (successMessage) {
        showSuccessToast(successMessage);
      }
      closeCardDetail();
    } catch (error: any) {
      showErrorPopup(error, '카드 세부사항');
    } finally {
      setCardSaving(false);
    }
  };

  const saveCardDetail = async () => {
    await persistCardDetail();
  };

  const completeTask = async () => {
    if (!cardDetail || !board) return;
    if (!menuCanEdit) {
      showErrorPopup(
        txt('업무 상태를 변경할 권한이 없습니다.', 'You do not have permission to change task status.'),
        txt('업무 완료', 'Complete task')
      );
      return;
    }
    const myMemberCt = board.members?.find((m: any) => m.user_id === user?.id);
    const isOwnerCt = myMemberCt?.role === 'owner' || user?.role === 'root';
    const assigneeUid = cardDetail.assigneeUserId != null ? Number(cardDetail.assigneeUserId) : null;
    const myUid = user?.id != null ? Number(user.id) : null;
    const isCardAssignee = assigneeUid != null && myUid != null && assigneeUid === myUid;
    if (!isOwnerCt && assigneeUid != null && !isCardAssignee) {
      showErrorPopup(
        txt(
          '업무 완료는 담당자 또는 보드 소유자만 할 수 있습니다.',
          'Only the assignee or board owner can complete this task.'
        ),
        txt('업무 완료', 'Complete task')
      );
      return;
    }

    let targetCompletedListId = completedList?.id;
    // 완료 열이 없으면 「업무 완료」 목록을 만들어 그곳으로 이동·기록
    if (!targetCompletedListId) {
      try {
        setCardSaving(true);
        const createRes = await workBoardService.createList(boardId, {
          title: txt('업무 완료', 'Done'),
        });
        if (!createRes.success || !createRes.data?.id) {
          showErrorPopup(
            createRes.message ||
              txt(
                '업무 완료 목록을 만들 수 없습니다. 보드에 「업무 완료」 목록을 추가해 주세요.',
                'Could not create a Done list. Please add a “Done” list to the board.'
              ),
            txt('업무 완료', 'Complete task')
          );
          return;
        }
        targetCompletedListId = Number(createRes.data.id);
        await loadBoard();
      } catch (error: any) {
        showErrorPopup(error, txt('업무 완료', 'Complete task'));
        return;
      } finally {
        setCardSaving(false);
      }
    }

    await persistCardDetail(
      targetCompletedListId,
      txt('업무가 완료되어 「업무 완료」 목록으로 이동했습니다.', 'Task completed and moved to the Done list.')
    );
  };

  const handleCompleteTask = () => {
    if (!cardDetail || !board) return;
    showConfirm(
      txt(
        '이 업무를 완료 처리하고 「업무 완료」 목록으로 이동하시겠습니까?',
        'Complete this task and move it to the Done list?'
      ),
      () => {
        void completeTask();
      },
      {
        title: txt('업무 완료 확인', 'Confirm task completion'),
        confirmText: txt('업무 완료', 'Complete Task'),
        cancelText: txt('취소', 'Cancel'),
        confirmColor: 'primary',
      }
    );
  };

  const handleDeleteCard = () => {
    if (!cardDetail?.cardId) return;
    if (!menuCanDelete) {
      showErrorPopup(
        txt('카드를 삭제할 권한이 없습니다.', 'You do not have permission to delete cards.'),
        txt('카드 세부사항', 'Card details')
      );
      return;
    }
    showConfirm(
      '',
      () => {
        void (async () => {
          setCardSaving(true);
          try {
            const res = await workBoardService.deleteCard(boardId, cardDetail.cardId);
            if (res.success) {
              closeCardDetail();
              await loadBoard();
              showSuccessToast(txt('카드가 삭제되었습니다.', 'Card deleted.'));
            } else {
              showErrorPopup(
                res.message || txt('카드 삭제에 실패했습니다.', 'Failed to delete card.'),
                txt('카드 세부사항', 'Card details')
              );
            }
          } catch (error: any) {
            showErrorPopup(error, txt('카드 세부사항', 'Card details'));
          } finally {
            setCardSaving(false);
          }
        })();
      },
      {
        titleKey: 'workBoards.cardDetail.deleteTitle',
        messageKey: 'workBoards.cardDetail.deleteConfirmMessage',
        confirmTextKey: 'common.delete',
        cancelTextKey: 'common.cancel',
        confirmColor: 'error',
      }
    );
  };

  const handleInvite = async () => {
    if (!selectedUsers.length) return;
    if (!menuCanEdit) {
      showErrorPopup(
        txt('멤버를 초대할 권한이 없습니다.', 'You do not have permission to invite members.'),
        txt('작업 보드', 'Work board')
      );
      return;
    }
    setInviteLoading(true);
    try {
      const settled = await Promise.allSettled(
        selectedUsers.map((member) => workBoardService.inviteMember(boardId, Number(member.id)))
      );
      let successCount = 0;
      const failedMessages: string[] = [];
      settled.forEach((entry) => {
        if (entry.status === 'fulfilled') {
          if (entry.value?.success) {
            successCount += 1;
          } else {
            failedMessages.push(String(entry.value?.message || txt('초대 실패', 'Invite failed')));
          }
          return;
        }
        failedMessages.push(String(entry.reason?.message || txt('초대 실패', 'Invite failed')));
      });

      if (successCount > 0) {
        showSuccessToast(
          successCount === 1
            ? txt('1명이 초대되었습니다.', '1 member has been invited.')
            : txt(`${successCount}명이 초대되었습니다.`, `${successCount} members have been invited.`)
        );
        setInviteOpen(false);
        setSelectedUsers([]);
        await loadBoard();
      } else {
        showErrorPopup(
          failedMessages[0] || txt('초대 실패', 'Invite failed'),
          txt('작업 보드', 'Work board')
        );
      }

      if (successCount > 0 && failedMessages.length > 0) {
        showErrorPopup(
          txt('일부 사용자는 이미 초대되었거나 초대에 실패했습니다.', 'Some users were already invited or failed to be invited.'),
          txt('작업 보드', 'Work board')
        );
      }
    } catch (e: any) {
      showErrorPopup(e, txt('작업 보드', 'Work board'));
    } finally {
      setInviteLoading(false);
    }
  };

  const closeMemberMenu = useCallback(() => {
    setMemberMenuAnchor(null);
    setMemberMenuTarget(null);
  }, []);

  const handleRemoveMember = (memberUserId: number, memberName: string) => {
    if (!menuCanEdit && Number(memberUserId) !== Number(user?.id)) return;
    closeMemberMenu();
    showConfirm(
      txt(
        `"${memberName}" 님을 이 보드 멤버에서 삭제하시겠습니까?`,
        `Remove "${memberName}" from this board?`
      ),
      () => {
        void (async () => {
          setMemberRemovingId(memberUserId);
          try {
            const res = await workBoardService.removeMember(boardId, memberUserId);
            if (res.success) {
              showSuccessToast(txt('멤버가 삭제되었습니다.', 'Member removed.'));
              await loadBoard();
            } else {
              showErrorPopup(
                res.message || txt('멤버 삭제 실패', 'Failed to remove member'),
                txt('작업 보드', 'Work board')
              );
            }
          } catch (e: any) {
            showErrorPopup(e, txt('작업 보드', 'Work board'));
          } finally {
            setMemberRemovingId(null);
          }
        })();
      },
      {
        title: txt('멤버 삭제', 'Delete member'),
        confirmText: txt('삭제', 'Delete'),
        cancelText: t('common.cancel'),
        confirmColor: 'error',
      }
    );
  };

  const openMemberMenu = (event: React.MouseEvent<HTMLElement>, member: any) => {
    event.preventDefault();
    event.stopPropagation();
    setMemberMenuAnchor(event.currentTarget);
    setMemberMenuTarget(member);
  };

  // 바깥(바탕) 클릭 시 멤버 드롭메뉴 닫기 — 보드 팬/툴팁과 충돌해도 닫히도록
  useEffect(() => {
    if (!memberMenuAnchor) return;
    const onPointerDownCapture = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        closeMemberMenu();
        return;
      }
      // 앵커 아바타·메뉴 본문 안 클릭은 유지
      if (memberMenuAnchor.contains(target)) return;
      if (target.closest('.MuiMenu-paper, .MuiPopover-paper')) return;
      closeMemberMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMemberMenu();
    };
    document.addEventListener('pointerdown', onPointerDownCapture, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDownCapture, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [memberMenuAnchor, closeMemberMenu]);

  const handleDeleteBoard = () => {
    const boardName = board?.name?.trim();
    const message = boardName
      ? t('workBoards.deleteConfirm.message', { name: boardName })
      : t('workBoards.deleteConfirm.messageFallback');
    showConfirm(
      message,
      () => {
        void (async () => {
          try {
            const res = await workBoardService.deleteBoard(boardId);
            if (res.success) {
              showSuccessPopup(t('workBoards.deleteConfirm.success'));
              navigate('/work/projects');
            } else {
              showErrorPopup(
                res.message || t('workBoards.deleteConfirm.failed'),
                t('workBoards.title')
              );
            }
          } catch (e: any) {
            showErrorPopup(e, t('workBoards.title'));
          }
        })();
      },
      {
        title: t('workBoards.deleteConfirm.title'),
        confirmText: t('common.delete'),
        cancelText: t('common.cancel'),
        confirmColor: 'error',
      }
    );
  };

  const myMember = board?.members?.find((m: any) => m.user_id === user?.id);
  const isOwner = myMember?.role === 'owner' || user?.role === 'root';
  const canManageMembers = isOwner && menuCanEdit;
  const isBoardCreator =
    board?.created_by != null && user?.id != null && Number(board.created_by) === Number(user.id);
  const canDeleteBoard = Boolean(isBoardCreator && menuCanDelete);
  const lists: BoardList[] = [...(board?.lists || [])].sort((a, b) => a.position - b.position);
  /** 「업무 완료」 우선, 없으면 완료/Done 키워드, 그래도 없으면 마지막 열 */
  const completedList = resolveCompletedList(lists);
  const activeLists = completedList
    ? lists.filter((list) => list.id !== completedList.id)
    : lists;
  const normalizedCardSearch = cardSearch.trim().toLowerCase();
  const cardSearchActive = normalizedCardSearch.length > 0;
  const displayActiveLists = useMemo(() => {
    if (!cardSearchActive) return activeLists;
    const boardMembers = (board?.members || []) as any[];
    return activeLists.map((list) => ({
      ...list,
      cards: (list.cards || []).filter((card) => {
        const creator = boardMembers.find(
          (member: any) => Number(member.user_id) === Number(card.created_by)
        );
        const referenceNames = (card.reference_user_ids || []).map((rid) => {
          const m = boardMembers.find((member: any) => Number(member.user_id) === Number(rid));
          return m?.user?.username || '';
        });
        const searchable = [
          card.title,
          getPlainTextFromHtml(card.description),
          card.assignee?.username,
          creator?.user?.username,
          list.title,
          list.assignee?.username,
          ...referenceNames,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchable.includes(normalizedCardSearch);
      }),
    }));
  }, [activeLists, board?.members, cardSearchActive, normalizedCardSearch]);
  const cardSearchMatchCount = useMemo(
    () => displayActiveLists.reduce((sum, list) => sum + (list.cards?.length || 0), 0),
    [displayActiveLists]
  );
  const completedCards = [...(completedList?.cards || [])].sort((a, b) => {
    const aTime = new Date(a.completed_at || 0).getTime();
    const bTime = new Date(b.completed_at || 0).getTime();
    if (aTime !== bTime) return bTime - aTime;
    return b.id - a.id;
  });
  const normalizedCompletedSearch = completedTaskSearch.trim().toLowerCase();
  const filteredCompletedCards = completedCards.filter((card) => {
    if (!normalizedCompletedSearch) return true;
    const creator = (board?.members || []).find(
      (member: any) => Number(member.user_id) === Number(card.created_by)
    );
    const searchable = [
      card.title,
      getPlainTextFromHtml(card.description),
      card.assignee?.username,
      creator?.user?.username,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return searchable.includes(normalizedCompletedSearch);
  });
  const completedTasksPerPage = 10;
  const completedTaskPageCount = Math.max(
    1,
    Math.ceil(filteredCompletedCards.length / completedTasksPerPage)
  );
  const paginatedCompletedCards = filteredCompletedCards.slice(
    (completedTaskPage - 1) * completedTasksPerPage,
    completedTaskPage * completedTasksPerPage
  );
  const reopenTargetList =
    activeLists.find((list) => {
      const title = String(list.title || '').replace(/\s+/g, '').toLowerCase();
      return title.includes('진행') || title.includes('progress') || title.includes('doing');
    }) ?? activeLists[0];
  const isCardDetailCompleted =
    !!cardDetail && !!completedList && cardDetail.listId === completedList.id;
  const completedCardDetail = isCardDetailCompleted
    ? completedCards.find((card) => card.id === cardDetail?.cardId)
    : undefined;
  const canReopenCardDetail =
    isCardDetailCompleted &&
    (() => {
      const uid = Number(user?.id);
      if (!uid) return false;
      const isCreator =
        cardDetail?.createdBy != null && Number(cardDetail.createdBy) === uid;
      const isAssignee =
        cardDetail?.assigneeUserId != null && Number(cardDetail.assigneeUserId) === uid;
      return isCreator || isAssignee;
    })();

  const canReopenCard = (card: BoardCard) => {
    const uid = Number(user?.id);
    if (!uid) return false;
    const isCreator = card.created_by != null && Number(card.created_by) === uid;
    const isAssignee = card.assignee?.id != null && Number(card.assignee.id) === uid;
    return isCreator || isAssignee;
  };

  const handleReopenCard = async (card: BoardCard, fromDetail = false) => {
    if (!reopenTargetList?.id || !canReopenCard(card)) return;
    setReopeningCardId(card.id);
    try {
      const response = await workBoardService.moveCard(
        boardId,
        card.id,
        reopenTargetList.id,
        reopenTargetList.cards?.length ?? 0
      );
      if (!response.success) {
        showErrorPopup(
          response.message || txt('업무 재오픈에 실패했습니다.', 'Failed to reopen task.'),
          txt('완료된 업무', 'Completed Tasks')
        );
        return;
      }
      await loadBoard({ silent: true });
      setCompletedTaskPage(1);
      if (fromDetail) {
        closeCardDetail();
      }
      showSuccessToast(
        txt(
          `업무를 「${displayBoardListTitle(reopenTargetList.title, language)}」 목록으로 재오픈했습니다.`,
          `Task reopened in “${displayBoardListTitle(reopenTargetList.title, language)}”.`
        )
      );
    } catch (error: any) {
      showErrorPopup(error, txt('완료된 업무', 'Completed Tasks'));
    } finally {
      setReopeningCardId(null);
    }
  };
  /** 담당자가 있으면 담당자·보드 소유자·root만 완료 열로 이동 가능. 담당자 없으면 보드 멤버 누구나. */
  const assigneeUidComplete =
    cardDetail?.assigneeUserId != null ? Number(cardDetail.assigneeUserId) : null;
  const myUidComplete = user?.id != null ? Number(user.id) : null;
  const isCardAssigneeComplete =
    assigneeUidComplete != null &&
    myUidComplete != null &&
    assigneeUidComplete === myUidComplete;
  const canUserCompleteTask =
    isOwner || assigneeUidComplete === null || isCardAssigneeComplete;
  const members = useMemo(
    () => (board?.members || []) as any[],
    [board?.members]
  );
  const memberOptions = useMemo<MemberOption[]>(
    () =>
      members.map((m: any) => ({
        id: Number(m.user_id),
        label: m.user?.username || `사용자 ${m.user_id}`,
        userid: m.user?.userid || `user${m.user_id}`
      })),
    [members]
  );
  /** 이미 보드 멤버인 사용자는 초대 검색에서 제외 */
  const inviteUserOptions = useMemo(() => {
    const memberIds = new Set(members.map((m: any) => Number(m.user_id)));
    return companyUsers.filter((u: any) => !memberIds.has(Number(u.id)));
  }, [companyUsers, members]);
  const mentionCandidates = useMemo<MemberOption[]>(() => {
    const keyword = mentionQuery.trim().toLowerCase();
    if (!keyword) return memberOptions.slice(0, 6);
    return memberOptions
      .filter((member) => {
        const normalizedName = member.label.replace(/\s+/g, '').toLowerCase();
        return (
          member.userid.toLowerCase().includes(keyword) ||
          member.label.toLowerCase().includes(keyword) ||
          normalizedName.includes(keyword)
        );
      })
      .slice(0, 6);
  }, [memberOptions, mentionQuery]);

  if (loading || !board) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <CircularProgress />
      </Box>
    );
  }

  const commentsBlockedUntilSave = !!cardDetail?.blockCommentsUntilDetailSave;
  const isCommentEnabled =
    menuCanEdit &&
    !!cardDetail?.title?.trim() &&
    !!cardDetail?.listId &&
    Number(cardDetail?.cardId) > 0 &&
    !commentsBlockedUntilSave;

  const handleCommentInputChange = (value: string) => {
    setNewComment(value);
    const mentionMatch = value.match(/(?:^|\s)@([^\s@]*)$/);
    if (!mentionMatch) {
      setMentionOpen(false);
      setMentionQuery('');
      setMentionHighlightIndex(0);
      return;
    }
    setMentionOpen(true);
    setMentionQuery(mentionMatch[1] || '');
    setMentionHighlightIndex(0);
  };

  const insertMention = (candidate: { id: number; label: string; userid: string }) => {
    setNewComment((prev) =>
      prev.replace(/(?:^|\s)@[^\s@]*$/, (token) => {
        const prefix = token.startsWith(' ') ? ' ' : '';
        return `${prefix}@${candidate.userid} `;
      })
    );
    setMentionedUserIds((prev) => Array.from(new Set([...prev, candidate.id])));
    setMentionOpen(false);
    setMentionQuery('');
    setMentionHighlightIndex(0);
  };

  return (
    <Box
      data-board-pan-surface=""
      onPointerDown={handleBoardPanPointerDown}
      onPointerMove={handleBoardPanPointerMove}
      onPointerUp={handleBoardPanPointerUp}
      onPointerCancel={handleBoardPanPointerUp}
      sx={{
        p: 0,
        pb: 2,
        flex: 1,
        width: '100%',
        minWidth: 0,
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
        boxSizing: 'border-box',
        background: 'transparent',
        cursor: boardPanning ? 'grabbing' : 'default',
        touchAction: boardPanning ? 'none' : 'auto',
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
          backgroundColor: 'background.paper',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'divider'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'text.secondary'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'primary.main',
            borderWidth: 1
          }
        },
        '& .MuiInputBase-input::placeholder': {
          color: 'text.secondary',
          opacity: 0.75
        }
      }}
    >
      <MvsPageHeader
        backTo="/work/projects"
        title={board.name}
        description={board.description?.trim() || undefined}
        actions={
          <>
        <Button
          startIcon={<CheckCircleIcon sx={{ fontSize: 18 }} />}
          variant="contained"
          color="success"
          disableElevation
          onClick={() => {
            setCompletedTaskSearch('');
            setCompletedTaskPage(1);
            setCompletedTasksOpen(true);
          }}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: '8px',
            px: 2,
            bgcolor: 'success.main',
            color: '#FFFFFF',
            '&:hover': {
              bgcolor: 'success.dark',
            },
          }}
        >
          {txt('완료된 업무', 'Completed Tasks')} ({completedCards.length})
        </Button>
        {menuCanEdit && (
          <Button
            startIcon={<PersonAddIcon sx={{ fontSize: 18 }} />}
            variant="outlined"
            color="primary"
            onClick={() => {
              setSelectedUsers([]);
              setInviteOpen(true);
              loadUsers();
            }}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '8px',
              px: 2,
              borderWidth: 1.5,
              borderColor: alpha(theme.palette.primary.main, 0.55),
              bgcolor: alpha(theme.palette.primary.main, 0.06),
              color: theme.palette.primary.dark,
              '&:hover': {
                borderWidth: 1.5,
                borderColor: theme.palette.primary.main,
                bgcolor: alpha(theme.palette.primary.main, 0.12),
              },
            }}
          >
            {txt('멤버 초대', 'Invite Member')}
          </Button>
        )}
        {menuCanCreate && (
          <Button
            startIcon={<LibraryAddOutlinedIcon sx={{ fontSize: 18 }} />}
            variant="contained"
            color="primary"
            disableElevation
            onClick={() => {
              setNewListTitle('');
              setNewListDescription('');
              setNewListAssigneeUserId(null);
              setAddListOpen(true);
            }}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '8px',
              px: 2,
              color: '#FFFFFF',
              '&:hover': {
                boxShadow: '0 4px 10px rgba(31, 111, 115, 0.22)',
              },
            }}
          >
            {txt('대분류 추가', 'Add List')}
          </Button>
        )}
        {canDeleteBoard && (
          <Button
            color="error"
            variant="contained"
            disableElevation
            startIcon={<DeleteIcon sx={{ fontSize: 18 }} />}
            onClick={handleDeleteBoard}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '8px',
              px: 2,
              color: '#FFFFFF',
              bgcolor: theme.palette.error.main,
              '&:hover': {
                bgcolor: theme.palette.error.dark,
              },
            }}
          >
            {t('workBoards.actions.deleteBoard')}
          </Button>
        )}
          </>
        }
      />

      <Box
        sx={{
          mb: 2.5,
          px: { xs: 1.25, sm: 1.5 },
          py: { xs: 1, sm: 1.15 },
          borderRadius: '8px',
          bgcolor: KANBAN_MEMBER_PANEL_BG,
          border: KANBAN_MEMBER_PANEL_BORDER,
          boxShadow: 'none',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              fontSize: '0.8125rem',
              letterSpacing: '-0.01em',
              color: '#42526E',
              flexShrink: 0,
            }}
          >
            {txt('보드 멤버', 'Board Members')} · {members.length}{txt('명', '')}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
              minWidth: 0,
              ml: { xs: 0, sm: 'auto' },
              mr: { xs: 0, sm: 1 },
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'flex-start', sm: 'flex-end' },
            }}
          >
            <TextField
              size="small"
              value={cardSearch}
              onChange={(e) => setCardSearch(e.target.value)}
              placeholder={txt(
                '카드 검색 (제목, 내용, 담당자, 참조)',
                'Search cards (title, details, assignee, reference)'
              )}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: '#475569' }} />
                  </InputAdornment>
                ),
                endAdornment: cardSearch ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label={txt('검색 지우기', 'Clear search')}
                      onClick={() => setCardSearch('')}
                      edge="end"
                    >
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{
                width: { xs: '100%', sm: 300 },
                maxWidth: '100%',
                '& .MuiOutlinedInput-root': {
                  borderRadius: KANBAN_CONTROL_RADIUS,
                  bgcolor: '#FFFFFF',
                  height: 38,
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
                  '& fieldset': {
                    borderColor: '#94A3B8',
                    borderWidth: 1.5,
                  },
                  '&:hover fieldset': {
                    borderColor: '#64748B',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: theme.palette.primary.main,
                    borderWidth: 1.5,
                  },
                },
                '& .MuiInputBase-input': {
                  color: '#0F172A',
                  fontWeight: 500,
                  fontSize: '0.8125rem',
                  '&::placeholder': {
                    color: '#64748B',
                    opacity: 1,
                  },
                },
              }}
            />
            {cardSearchActive ? (
              <Typography
                variant="body2"
                sx={{ fontSize: '0.75rem', flexShrink: 0, color: '#475569', fontWeight: 600 }}
              >
                {cardSearchMatchCount > 0
                  ? txt(`${cardSearchMatchCount}건`, `${cardSearchMatchCount} match(es)`)
                  : txt('검색 결과 없음', 'No matches')}
              </Typography>
            ) : null}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flexShrink: 0 }}>
            {members.slice(0, BOARD_MEMBER_AVATAR_MAX).map((m: any, index: number) => {
              const name = m.user?.username || `${txt('사용자', 'User')} ${m.user_id}`;
              const initial = name.trim().charAt(0).toUpperCase() || '?';
              const avatarSrc = resolveUserAvatarSrc(m.user?.avatar_url);
              const isOwnerMember = m.role === 'owner';
              const roleLabel = isOwnerMember ? txt('소유자', 'Owner') : txt('멤버', 'Member');
              const userid = m.user?.userid ? String(m.user.userid) : '';
              const menuOpenForThis =
                Boolean(memberMenuAnchor) &&
                Number(memberMenuTarget?.user_id) === Number(m.user_id);
              return (
                <Tooltip
                  key={m.id ?? m.user_id}
                  title={
                    <Box sx={{ textAlign: 'center', color: '#F8FAFC' }}>
                      <Typography
                        variant="caption"
                        display="block"
                        sx={{ fontWeight: 700, color: '#F8FAFC', lineHeight: 1.35 }}
                      >
                        {name}
                      </Typography>
                      <Typography
                        variant="caption"
                        display="block"
                        sx={{ color: 'rgba(248, 250, 252, 0.88)', lineHeight: 1.35 }}
                      >
                        {roleLabel}
                        {userid ? ` · ${userid}` : ''}
                      </Typography>
                    </Box>
                  }
                  arrow
                  placement="top"
                  disableHoverListener={menuOpenForThis}
                  slotProps={{
                    tooltip: {
                      sx: {
                        bgcolor: '#1e293b',
                        color: '#F8FAFC',
                        '& .MuiTooltip-arrow': { color: '#1e293b' },
                      },
                    },
                  }}
                >
                  <Avatar
                    component="button"
                    type="button"
                    data-no-photo-preview
                    src={avatarSrc}
                    alt={name}
                    aria-label={`${name}, ${roleLabel}`}
                    aria-haspopup="menu"
                    aria-expanded={menuOpenForThis}
                    onClick={(e) => openMemberMenu(e, m)}
                    sx={{
                      width: BOARD_MEMBER_AVATAR_SIZE,
                      height: BOARD_MEMBER_AVATAR_SIZE,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: menuOpenForThis
                        ? `2px solid ${theme.palette.primary.main}`
                        : '2px solid #FFFFFF',
                      boxSizing: 'border-box',
                      ml: index === 0 ? 0 : `-${BOARD_MEMBER_AVATAR_OVERLAP_PX}px`,
                      zIndex: menuOpenForThis ? BOARD_MEMBER_AVATAR_MAX + 3 : index + 1,
                      cursor: 'pointer',
                      p: 0,
                      bgcolor: avatarSrc
                        ? 'transparent'
                        : isOwnerMember
                          ? 'primary.main'
                          : getAvatarColor(Number(m.user_id)),
                      color: '#FFFFFF',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      ...(isOwnerMember
                        ? { boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.45)}` }
                        : {}),
                      '&:hover': {
                        cursor: 'pointer',
                        zIndex: BOARD_MEMBER_AVATAR_MAX + 2,
                        boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.45)}`,
                      },
                      '& img': {
                        cursor: 'pointer',
                      },
                    }}
                  >
                    {initial}
                  </Avatar>
                </Tooltip>
              );
            })}
            {members.length > BOARD_MEMBER_AVATAR_MAX ? (
              <Tooltip
                title={members
                  .slice(BOARD_MEMBER_AVATAR_MAX)
                  .map((m: any) => m.user?.username || `${txt('사용자', 'User')} ${m.user_id}`)
                  .join(', ')}
                arrow
                placement="top"
              >
                <Avatar
                  sx={{
                    width: BOARD_MEMBER_AVATAR_SIZE,
                    height: BOARD_MEMBER_AVATAR_SIZE,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    border: '2px solid #FFFFFF',
                    boxSizing: 'border-box',
                    ml: `-${BOARD_MEMBER_AVATAR_OVERLAP_PX}px`,
                    zIndex: BOARD_MEMBER_AVATAR_MAX + 1,
                    bgcolor: '#DFE1E6',
                    color: '#42526E',
                  }}
                >
                  +{members.length - BOARD_MEMBER_AVATAR_MAX}
                </Avatar>
              </Tooltip>
            ) : null}
          </Box>
        </Box>
      </Box>

      <Menu
        anchorEl={memberMenuAnchor}
        open={Boolean(memberMenuAnchor && memberMenuTarget)}
        onClose={closeMemberMenu}
        disableScrollLock
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          backdrop: {
            sx: { backgroundColor: 'transparent' },
          },
          paper: {
            sx: {
              borderRadius: '8px',
              minWidth: 180,
              mt: 0.75,
              border: '1px solid #E2E8F0',
              boxShadow: '0 8px 24px rgba(9, 30, 66, 0.14)',
              overflow: 'hidden',
            },
          },
        }}
      >
        {memberMenuTarget ? (() => {
          const m = memberMenuTarget;
          const name = m.user?.username || `${txt('사용자', 'User')} ${m.user_id}`;
          const avatarSrc = resolveUserAvatarSrc(m.user?.avatar_url);
          const isOwnerMember = m.role === 'owner';
          const ownerCount = members.filter((x: any) => x.role === 'owner').length;
          const isLastOwner = isOwnerMember && ownerCount <= 1;
          const isSelf = Number(m.user_id) === Number(user?.id || 0);
          const canRemoveMember =
            (canManageMembers || isSelf) &&
            (menuCanEdit || isSelf) &&
            !isLastOwner;
          return [
            <MenuItem
              key="view-photo"
              onClick={() => {
                closeMemberMenu();
                if (avatarSrc) {
                  photoPreview?.openPhotoPreview(avatarSrc, name);
                } else {
                  showErrorPopup(
                    txt('등록된 사진이 없습니다.', 'No photo available.'),
                    txt('사진보기', 'View photo')
                  );
                }
              }}
              sx={{ py: 1.1 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <PhotoOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={txt('사진보기', 'View photo')}
                primaryTypographyProps={{ fontWeight: 600, fontSize: '0.8125rem' }}
              />
            </MenuItem>,
            <MenuItem
              key="remove-member"
              onClick={() => {
                if (!canRemoveMember) return;
                handleRemoveMember(Number(m.user_id), name);
              }}
              disabled={!canRemoveMember || memberRemovingId === Number(m.user_id)}
              sx={{
                py: 1.1,
                color: canRemoveMember ? theme.palette.error.main : undefined,
                '&:hover': canRemoveMember
                  ? { bgcolor: alpha(theme.palette.error.main, 0.08) }
                  : undefined,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: canRemoveMember ? 'inherit' : undefined,
                }}
              >
                {memberRemovingId === Number(m.user_id) ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <DeleteIcon fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  isSelf && !canManageMembers
                    ? txt('보드 나가기', 'Leave board')
                    : txt('보드에서 삭제', 'Remove from board')
                }
                primaryTypographyProps={{ fontWeight: 600, fontSize: '0.8125rem' }}
              />
            </MenuItem>,
          ];
        })() : null}
      </Menu>

      {!cardDetail && (
        <DndContext
          sensors={sensors}
          autoScroll={false}
          collisionDetection={kanbanCollisionDetection}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.BeforeDragging,
            },
          }}
          onDragStart={handleDragStart}
          onDragCancel={handleDragCancel}
          onDragEnd={menuCanEdit && !cardSearchActive ? handleDragEnd : () => {}}
        >
          <Box
            ref={boardHScrollRef}
            sx={{
              display: 'flex',
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
              overflowX: 'auto',
              overflowY: 'visible',
              cursor: boardPanning ? 'grabbing' : 'grab',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'nowrap',
                alignItems: 'flex-start',
                gap: 1.5,
                pb: 0.5,
                width: 'max-content',
                minWidth: '100%',
                boxSizing: 'border-box',
              }}
            >
            {displayActiveLists.map((list) => (
              <ListColumn
                key={list.id}
                list={list}
                members={members}
                isCompletedList={isCompletedListTitle(list.title) || completedList?.id === list.id}
                txt={txt}
                language={language}
                listTitleEditing={editingListId === list.id}
                listTitleDraft={editingListId === list.id ? editingListTitle : list.title}
                listSaving={listSaving}
                composerOpen={composerListId === list.id && !cardSearchActive}
                composerTitle={composerTitle}
                composerDesc={composerDesc}
                onListTitleDraftChange={setEditingListTitle}
                onStartEditListTitle={startEditListTitleById}
                onOpenListSettings={openListSettingsById}
                onSaveListTitle={saveListTitle}
                onDeleteList={deleteList}
                onComposerTitleChange={setComposerTitle}
                onComposerDescChange={setComposerDesc}
                onOpenComposer={openComposer}
                onCloseComposer={closeComposer}
                onSubmitCard={submitCard}
                savingCard={savingCard}
                onOpenCardDetail={openCardDetail}
                allowListReorder={menuCanEdit && !cardSearchActive}
                allowListTitleEdit={menuCanEdit}
                allowListDelete={menuCanDelete}
                allowAddCard={menuCanCreate && !cardSearchActive}
              />
            ))}
            </Box>
          </Box>
          <DragOverlay
            adjustScale={false}
            dropAnimation={null}
            modifiers={[snapCenterToCursor, restrictToWindowEdges]}
            zIndex={1500}
          >
            {activeCard ? (
              <Card
                elevation={0}
                sx={{
                  width: WORK_BOARD_COLUMN_WIDTH_PX,
                  maxWidth: WORK_BOARD_COLUMN_WIDTH_PX,
                  height: 'auto',
                  minHeight: WORK_BOARD_CARD_MIN_HEIGHT_PX,
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: KANBAN_CARD_RADIUS,
                  border: 'none',
                  bgcolor: theme.palette.mode === 'light' ? KANBAN_CARD_BG : alpha(theme.palette.grey[900], 0.88),
                  boxShadow: KANBAN_CARD_HOVER_SHADOW,
                  cursor: 'grabbing',
                  touchAction: 'none',
                  transform: 'translateZ(0)',
                  willChange: 'transform',
                  overflow: 'hidden',
                }}
              >
                {activeCard.color && isHexColor(activeCard.color) ? (
                  <Box sx={{ height: 6, flexShrink: 0, bgcolor: String(activeCard.color) }} />
                ) : null}
                <CardContent
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    py: 1.15,
                    px: 1.25,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.85,
                    overflow: 'hidden',
                    '&:last-child': { pb: 1.15 },
                  }}
                >
                  <KanbanInlineTitle
                    title={activeCard.title || ''}
                    descriptionPlain={
                      activeCard.description && !isRichTextEmpty(activeCard.description)
                        ? getPlainTextFromHtml(activeCard.description)
                        : ''
                    }
                    compact
                  />
                </CardContent>
              </Card>
            ) : activeList ? (
              <Paper
                elevation={0}
                sx={{
                  width: WORK_BOARD_COLUMN_WIDTH_PX,
                  maxWidth: WORK_BOARD_COLUMN_WIDTH_PX,
                  boxSizing: 'border-box',
                  p: 1.25,
                  borderRadius: KANBAN_COLUMN_RADIUS,
                  border: KANBAN_COLUMN_BORDER,
                  bgcolor: KANBAN_COLUMN_BG,
                  backdropFilter: 'none',
                  WebkitBackdropFilter: 'none',
                  boxShadow: KANBAN_CARD_HOVER_SHADOW,
                  cursor: 'grabbing',
                  touchAction: 'none',
                  transform: 'translateZ(0)',
                  willChange: 'transform',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#172B4D', flex: 1 }}>
                    {displayBoardListTitle(activeList.title, language)}
                  </Typography>
                  <Typography sx={{ fontSize: '0.8125rem', color: '#6B778C' }}>
                    {(activeList.cards || []).length}
                  </Typography>
                </Box>
              </Paper>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {cardDetail && (
        <Paper
          elevation={0}
          sx={(theme) => {
            const custom = cardDetail.color?.trim();
            const accent = custom || theme.palette.primary.main;
            return {
              mt: 1.5,
              mb: 2,
              height: 'auto',
              borderRadius: KANBAN_DETAIL_SHELL_RADIUS,
              boxShadow: '0 1px 0 #E2E8F0, 0 1px 2px rgba(15, 23, 42, 0.05)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
              borderLeft: `4px solid ${accent}`,
              bgcolor: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
            };
          }}
        >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            borderBottom: '1px solid #E2E8F0',
            bgcolor: '#FFFFFF',
            py: 1,
            px: 1.5,
          }}
        >
          <Button
            size="small"
            variant="contained"
            disableElevation
            startIcon={<ArrowBackIcon sx={{ fontSize: 18 }} />}
            onClick={closeCardDetail}
            sx={{
              minWidth: 0,
              px: 1.5,
              py: 0.5,
              height: 36,
              fontWeight: 700,
              fontSize: '0.875rem',
              letterSpacing: '-0.01em',
              textTransform: 'none',
              borderRadius: KANBAN_CONTROL_RADIUS,
              bgcolor: '#0F766E',
              color: '#FFFFFF',
              '&:hover': {
                bgcolor: '#0D9488',
              },
            }}
          >
            {txt('뒤로 가기', 'Back')}
          </Button>
        </Box>
        <Box
          sx={{
            pt: 1.25,
            px: 1.25,
            pb: 1.25,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.4,
            bgcolor: '#F8FAFC',
            overflow: 'visible',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.42 }}>
          <Box
            sx={{
              ...cardDetailFormSectionSx,
              py: 0.32,
            }}
          >
          <TextField
            fullWidth
            size="small"
            label={txt('제목', 'Title')}
            {...CARD_DETAIL_OUTLINED}
            variant="outlined"
            value={cardDetail?.title || ''}
            onChange={(e) =>
              setCardDetail((prev) =>
                prev ? { ...prev, title: e.target.value } : prev
              )
            }
            disabled={!menuCanEdit}
            placeholder={txt('카드 제목', 'Card Title')}
            sx={cardDetailOutlinedWhiteSx}
          />
          </Box>

          <Box
            sx={{
              ...cardDetailFormSectionSx,
              py: 0.37,
            }}
          >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                gap: 1.58
            }}
          >
            <TextField
              select
              fullWidth
              size="small"
              label={txt('목록', 'List')}
              {...CARD_DETAIL_OUTLINED}
              variant="outlined"
              value={cardDetail?.listId || ''}
              disabled={!menuCanEdit}
              onChange={(e) => {
                const nextListId = Number(e.target.value);
                const targetList = lists.find((l) => l.id === nextListId);
                const listAssignee = resolveListAssigneeForCard(targetList);
                setCardDetail((prev) => {
                  if (!prev) return prev;
                  if (!listAssignee || prev.originalListId === nextListId) {
                    return { ...prev, listId: nextListId };
                  }
                  const prevAssigneeId =
                    prev.assigneeUserId != null ? Number(prev.assigneeUserId) : null;
                  const nextRefs = new Set(
                    (prev.referenceUserIds || [])
                      .map((id) => Number(id))
                      .filter((id) => Number.isInteger(id) && id > 0)
                  );
                  if (prevAssigneeId != null && prevAssigneeId !== listAssignee.id) {
                    nextRefs.add(prevAssigneeId);
                  }
                  nextRefs.delete(listAssignee.id);
                  return {
                    ...prev,
                    listId: nextListId,
                    assigneeUserId: listAssignee.id,
                    referenceUserIds: Array.from(nextRefs)
                  };
                });
              }}
              sx={cardDetailOutlinedWhiteSx}
            >
              {lists.map((list) => (
                <MenuItem key={list.id} value={list.id}>
                  {displayBoardListTitle(list.title, language)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              size="small"
              label={txt('담당자', 'Assignee')}
              {...CARD_DETAIL_OUTLINED}
              variant="outlined"
              value={cardDetail?.assigneeUserId ?? ''}
              disabled={!menuCanEdit}
              onChange={(e) =>
                setCardDetail((prev) =>
                  prev
                    ? {
                        ...prev,
                        assigneeUserId: e.target.value === '' ? null : Number(e.target.value)
                      }
                    : prev
                )
              }
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) => {
                  if (selected === '' || selected == null) return txt('미지정', 'Unassigned');
                  const m = members.find((mem: any) => mem.user_id === Number(selected));
                  return m?.user?.username || `${txt('사용자', 'User')} ${selected}`;
                },
              }}
              sx={cardDetailOutlinedWhiteSx}
            >
              <MenuItem value="">{txt('미지정', 'Unassigned')}</MenuItem>
              {members.map((m: any) => (
                <MenuItem key={m.user_id} value={m.user_id}>
                  {m.user?.username || `${txt('사용자', 'User')} ${m.user_id}`}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="date"
              fullWidth
              size="small"
              label={txt('만료일', 'Due Date')}
              {...CARD_DETAIL_OUTLINED}
              variant="outlined"
              value={cardDetail?.dueDate || ''}
              disabled={!menuCanEdit}
              onChange={(e) =>
                setCardDetail((prev) =>
                  prev ? { ...prev, dueDate: e.target.value } : prev
                )
              }
              sx={cardDetailOutlinedWhiteSx}
            />
          </Box>
          </Box>

          <Box
            sx={{
              ...cardDetailFormSectionSx,
              py: 0.37,
            }}
          >
            <Autocomplete
              multiple
              disabled={!menuCanEdit}
              options={memberOptions}
              value={memberOptions.filter((option) => (cardDetail?.referenceUserIds || []).includes(option.id))}
              onChange={(_event, selected) => {
                const nextIds = selected.map((item) => item.id);
                setCardDetail((prev) => (prev ? { ...prev, referenceUserIds: nextIds } : prev));
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    size="small"
                    label={option.label}
                    {...getTagProps({ index })}
                    key={option.id}
                    sx={{ borderRadius: KANBAN_CHIP_RADIUS, fontWeight: 600 }}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label={txt('참조자', 'References')}
                  {...CARD_DETAIL_OUTLINED}
                  placeholder={txt('참조할 사용자 선택', 'Select reference users')}
                  sx={{
                    ...cardDetailOutlinedWhiteSx,
                    '& .MuiOutlinedInput-root': {
                      ...(cardDetailOutlinedWhiteSx['& .MuiOutlinedInput-root'] as Record<string, unknown>),
                      height: 'auto',
                      minHeight: 46,
                      alignItems: 'center',
                      py: 0.68,
                    },
                  }}
                />
              )}
            />
          </Box>

          <Box
            sx={{
              ...cardDetailFormSectionSx,
              borderRadius: KANBAN_SURFACE_RADIUS,
            }}
          >
            <Typography
              variant="caption"
              sx={{ ...cardDetailFieldLabelSx, mb: 0.5 }}
            >
              {txt('카드 색상', 'Card Color')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
            <TextField
              type="color"
              hiddenLabel
              variant="outlined"
              size="small"
              value={cardDetail?.color || '#1976D2'}
              disabled={!menuCanEdit}
              onChange={(e) =>
                setCardDetail((prev) => (prev ? { ...prev, color: e.target.value } : prev))
              }
              sx={{
                width: 44,
                '& .MuiOutlinedInput-root': {
                  borderRadius: KANBAN_CONTROL_RADIUS,
                  bgcolor: '#FFFFFF',
                  p: 0.25,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#94A3B8' },
                },
                '& input[type="color"]': {
                  borderRadius: KANBAN_CONTROL_RADIUS,
                  cursor: 'pointer',
                  minHeight: 28,
                },
              }}
            />
            <Button
              size="small"
              variant={!cardDetail?.color ? 'contained' : 'text'}
              disabled={!menuCanEdit}
              onClick={() =>
                setCardDetail((prev) => (prev ? { ...prev, color: '' } : prev))
              }
              sx={{
                borderRadius: KANBAN_CONTROL_RADIUS,
                minWidth: 48,
                fontWeight: 600,
                bgcolor: !cardDetail?.color ? 'primary.main' : '#FFFFFF',
                color: !cardDetail?.color ? '#FFFFFF' : 'primary.main',
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: !cardDetail?.color ? 'primary.dark' : '#F8FAFC',
                  boxShadow: 'none',
                },
              }}
            >
              {txt('기본', 'Default')}
            </Button>
            {CARD_COLOR_PRESETS.map((hex) => (
              <Button
                key={hex}
                size="small"
                variant="text"
                disabled={!menuCanEdit}
                onClick={() =>
                  setCardDetail((prev) => (prev ? { ...prev, color: hex } : prev))
                }
                sx={{
                  minWidth: 28,
                  width: 28,
                  height: 28,
                  p: 0,
                  borderRadius: KANBAN_CONTROL_RADIUS,
                  border: 'none',
                  bgcolor: cardDetail?.color === hex ? hex : hexToRgba(hex, 0.38),
                  boxShadow: cardDetail?.color === hex ? `0 0 0 2px #FFFFFF, 0 0 0 3px ${hex}` : 'none',
                  '&:hover': { bgcolor: hex, opacity: 0.9, boxShadow: 'none' },
                }}
              />
            ))}
            </Box>
          </Box>
          </Box>

          <Box
            sx={{
              border: 'none',
              borderRadius: KANBAN_SURFACE_RADIUS,
              p: 0,
              minWidth: 0,
              flexShrink: 0,
              overflow: 'hidden',
              bgcolor: 'transparent',
            }}
          >
            <Typography
              variant="caption"
              sx={{ ...cardDetailFieldLabelSx, mb: 0.5, ml: 0.25 }}
            >
              {txt('설명', 'Description')}
            </Typography>
            <RichTextEditor
              readOnly={!menuCanEdit}
              value={cardDetail?.description || ''}
              onChange={(value) =>
                setCardDetail((prev) => (prev ? { ...prev, description: value } : prev))
              }
              minHeight={160}
              placeholder={txt(
                '설명을 입력하세요. 이미지 업로드, 글자 크기/색상 변경이 가능합니다.',
                'Enter description. Image upload and text size/color changes are available.'
              )}
              sx={{ borderRadius: KANBAN_CONTROL_RADIUS, width: '100%' }}
            />
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {menuCanDelete ? (
                <Button
                  size="small"
                  variant="contained"
                  disableElevation
                  onClick={handleDeleteCard}
                  disabled={cardSaving || !cardDetail?.cardId}
                  sx={{
                    borderRadius: KANBAN_CONTROL_RADIUS,
                    minWidth: 104,
                    height: 40,
                    fontWeight: 700,
                    bgcolor: '#DC2626',
                    color: '#FFFFFF',
                    '&:hover': {
                      bgcolor: '#B91C1C',
                    },
                    '&.Mui-disabled': {
                      bgcolor: alpha('#DC2626', 0.35),
                      color: '#FFFFFF',
                    },
                  }}
                >
                  {txt('카드 삭제', 'Delete Card')}
                </Button>
              ) : null}
              <Tooltip
                title={
                  isCardDetailCompleted && !canReopenCardDetail
                    ? txt(
                        '담당자 또는 업무를 지시한 사람만 재오픈할 수 있습니다.',
                        'Only the assignee or task creator can reopen it.'
                      )
                    : ''
                }
              >
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    size="small"
                    color={isCardDetailCompleted ? 'primary' : 'success'}
                    variant={isCardDetailCompleted ? 'outlined' : 'contained'}
                    disableElevation
                    onClick={() => {
                      if (isCardDetailCompleted) {
                        if (completedCardDetail) {
                          void handleReopenCard(completedCardDetail, true);
                        }
                        return;
                      }
                      handleCompleteTask();
                    }}
                    disabled={
                      isCardDetailCompleted
                        ? !canReopenCardDetail ||
                          !completedCardDetail ||
                          !reopenTargetList?.id ||
                          reopeningCardId === cardDetail?.cardId
                        : !menuCanEdit ||
                          cardSaving ||
                          !cardDetail?.title?.trim() ||
                          !canUserCompleteTask
                    }
                    sx={{
                      borderRadius: KANBAN_CONTROL_RADIUS,
                      minWidth: 120,
                      height: 40,
                      fontWeight: 700,
                      flexShrink: 0,
                      ...(isCardDetailCompleted
                        ? {
                            borderWidth: 1.5,
                            bgcolor: alpha('#1D4E7C', 0.06),
                            '&:hover': {
                              borderWidth: 1.5,
                              bgcolor: alpha('#1D4E7C', 0.12),
                            },
                          }
                        : {
                            bgcolor: 'success.main',
                            color: '#FFFFFF',
                            '&:hover': { bgcolor: 'success.dark' },
                            '&.Mui-disabled': {
                              bgcolor: alpha('#7FA88A', 0.4),
                              color: '#FFFFFF',
                            },
                          }),
                    }}
                  >
                    {reopeningCardId === cardDetail?.cardId
                      ? <CircularProgress size={16} color="inherit" />
                      : isCardDetailCompleted
                        ? txt('재오픈', 'Reopen')
                        : txt('업무 완료', 'Complete Task')}
                  </Button>
                </span>
              </Tooltip>
            </Box>
            <Button
              size="small"
              variant="contained"
              color="primary"
              disableElevation
              onClick={saveCardDetail}
              disabled={!menuCanEdit || cardSaving || !cardDetail?.title?.trim()}
              sx={{
                borderRadius: KANBAN_CONTROL_RADIUS,
                minWidth: 104,
                height: 40,
                fontWeight: 700,
                boxShadow: 'none',
                ml: 'auto',
              }}
            >
              {cardSaving ? <CircularProgress size={18} color="inherit" /> : txt('저장', 'Save')}
            </Button>
          </Box>

          <Paper
            elevation={0}
            sx={{
              ...cardDetailSectionPaperSx,
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              p: 1.5,
              borderRadius: KANBAN_SURFACE_RADIUS,
              border: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
            }}
          >
          <Typography
            variant="caption"
            sx={{
              ...cardDetailFieldLabelSx,
              mb: 1,
              fontSize: '0.8125rem',
              color: '#334155',
            }}
          >
            {txt('댓글 및 활동', 'Comments & Activity')}
          </Typography>
          {commentsBlockedUntilSave ? (
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, py: 0.5 }}>
              {txt(
                '카드 세부 내용을 저장한 후 댓글을 작성할 수 있습니다.',
                'Save the card details before writing comments.'
              )}
            </Typography>
          ) : (
            <>
          {replyParentId != null && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                mb: 0.75,
                py: 0.5,
                px: 1,
                borderRadius: KANBAN_CONTROL_RADIUS,
                border: '1px solid #E2E8F0',
                bgcolor: '#F0F4F8',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                {(() => {
                  const target = cardComments.find((c) => c.id === replyParentId);
                  const name = target?.user?.username || txt('알 수 없는 사용자', 'Unknown user');
                  return txt(`${name}님에게 답글 작성 중`, `Replying to ${name}`);
                })()}
              </Typography>
              <Button
                size="small"
                variant="text"
                onClick={() => setReplyParentId(null)}
                sx={{ minWidth: 'auto', py: 0, px: 0.5, fontSize: '0.75rem' }}
              >
                {txt('취소', 'Cancel')}
              </Button>
            </Box>
          )}
          <Box
            sx={{
              display: 'flex',
              mb: 0.75,
              border: '1px solid #E2E8F0',
              borderRadius: KANBAN_CONTROL_RADIUS,
              overflow: 'hidden',
              bgcolor: '#FFFFFF',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            }}
          >
            <TextField
              fullWidth
              hiddenLabel
              size="small"
              placeholder={txt('댓글을 입력하세요', 'Write a comment')}
              value={newComment}
              inputRef={commentInputRef}
              onChange={(e) => handleCommentInputChange(e.target.value)}
              disabled={!isCommentEnabled}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 0,
                  height: 40,
                  bgcolor: '#FFFFFF',
                  '& fieldset': {
                    border: 'none',
                  },
                },
                '& .MuiInputBase-input': {
                  fontSize: '0.875rem',
                  py: '10px',
                  color: '#1E293B',
                  '&::placeholder': {
                    color: '#94A3B8',
                    opacity: 1,
                  },
                },
                '& .Mui-disabled': {
                  WebkitTextFillColor: '#94A3B8',
                },
              }}
              onKeyDown={(e) => {
                if (mentionOpen && mentionCandidates.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setMentionHighlightIndex((prev) => (prev + 1) % mentionCandidates.length);
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setMentionHighlightIndex((prev) => (prev - 1 + mentionCandidates.length) % mentionCandidates.length);
                    return;
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const candidate = mentionCandidates[mentionHighlightIndex] || mentionCandidates[0];
                    if (candidate) {
                      insertMention(candidate);
                    }
                    return;
                  }
                  if (e.key === 'Escape') {
                    setMentionOpen(false);
                    return;
                  }
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void submitComment();
                }
              }}
            />
            <Popper
              open={mentionOpen && mentionCandidates.length > 0}
              anchorEl={commentInputRef.current}
              placement="top-start"
              sx={{
                zIndex: 2000,
                width: commentInputRef.current?.clientWidth || 320
              }}
            >
              <Paper variant="outlined" sx={{ mt: 0.5, maxHeight: 220, overflowY: 'auto' }}>
                {mentionCandidates.map((candidate, index) => (
                  <MenuItem
                    key={candidate.id}
                    selected={index === mentionHighlightIndex}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      insertMention(candidate);
                    }}
                  >
                    @{candidate.userid} ({candidate.label})
                  </MenuItem>
                ))}
              </Paper>
            </Popper>
            <Button
              size="small"
              variant="contained"
              onClick={submitComment}
              disabled={!isCommentEnabled || commentSaving || !newComment.trim()}
              sx={{
                minWidth: 80,
                px: 1.5,
                height: 40,
                alignSelf: 'stretch',
                borderRadius: 0,
                boxShadow: 'none',
                fontWeight: 700,
                fontSize: '0.8125rem',
                textTransform: 'none',
                borderLeft: '1px solid #E2E8F0',
                bgcolor: 'primary.main',
                color: '#FFFFFF',
                '&:hover': {
                  bgcolor: 'primary.dark',
                  boxShadow: 'none',
                },
                '&.Mui-disabled': {
                  bgcolor: '#E2E8F0',
                  color: '#64748B',
                },
              }}
            >
              {commentSaving ? <CircularProgress size={18} color="inherit" /> : txt('댓글', 'Comment')}
            </Button>
          </Box>
          {!isCommentEnabled && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {txt('먼저 제목/목록 등 기본 정보를 입력해 주세요.', 'Please fill in required fields such as title/list first.')}
            </Typography>
          )}
          <Paper
            elevation={0}
            sx={{
              p: 1,
              minHeight: 96,
              overflowY: 'visible',
              bgcolor: '#F8FAFC',
              border: '1px solid #D5DCE3',
              borderRadius: KANBAN_CONTROL_RADIUS,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
            }}
          >
            {commentLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.25 }}>
                <CircularProgress size={20} />
              </Box>
            ) : cardComments.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4, px: 0.5, py: 1 }}>
                {txt('아직 댓글이 없습니다.', 'No comments yet.')}
              </Typography>
            ) : (
              cardComments.map((comment) => {
                const canDelete =
                  menuCanEdit && (isOwner || comment.user_id === user?.id || user?.role === 'root');
                const isReply = !!(comment.parent_id && comment.parent_id > 0);
                const canReplyToComment = isCommentEnabled && !isReply;
                return (
                  <Box
                    key={comment.id}
                    sx={{
                      px: 1.1,
                      py: 0.9,
                      pl: isReply ? 2 : 1.1,
                      borderRadius: KANBAN_CONTROL_RADIUS,
                      border: '1px solid #E2E8F0',
                      borderLeft: isReply ? '3px solid #1D4E7C' : '1px solid #E2E8F0',
                      bgcolor: '#FFFFFF',
                      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 0.75,
                        flexWrap: 'nowrap'
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.35,
                          flex: 1,
                          minWidth: 0
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="span"
                          sx={{ flexShrink: 0, lineHeight: 1.35, fontWeight: 600 }}
                        >
                          {(comment.user?.username || txt('알 수 없는 사용자', 'Unknown user'))} ·{' '}
                          {formatDateTime(comment.created_at)}
                        </Typography>
                        <Typography
                          variant="body2"
                          component="span"
                          sx={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            lineHeight: 1.45,
                            flex: 1,
                            minWidth: 0,
                            color: '#1E293B',
                          }}
                        >
                          {renderCommentWithMentions(comment.content || '')}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexShrink: 0, alignItems: 'flex-start', gap: 0.25 }}>
                        {canReplyToComment && (
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => {
                              setReplyParentId(comment.id);
                              commentInputRef.current?.focus();
                            }}
                            sx={{ minWidth: 'auto', py: 0, px: 0.5, fontSize: '0.75rem' }}
                          >
                            {txt('답글', 'Reply')}
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="small"
                            color="error"
                            onClick={() => {
                              void removeComment(comment.id);
                            }}
                            disabled={commentDeletingId === comment.id}
                            sx={{ minWidth: 'auto', py: 0, px: 0.75, fontSize: '0.75rem' }}
                          >
                            {commentDeletingId === comment.id ? txt('삭제 중...', 'Deleting...') : txt('삭제', 'Delete')}
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Box>
                );
              })
            )}
          </Paper>
            </>
          )}
          </Paper>
        </Box>
      </Paper>
      )}

      <Dialog
        open={addListOpen}
        onClose={() => {
          if (!creatingList) {
            setAddListOpen(false);
            setNewListTitle('');
            setNewListDescription('');
            setNewListAssigneeUserId(null);
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{txt('대분류 추가', 'Add List')}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {txt(
              '새 열(대분류) 이름·설명·담당자를 입력하세요. 담당자는 선택 사항입니다.',
              'Enter a name, optional description, and optional list owner for the new list.'
            )}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            hiddenLabel
            size="small"
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !creatingList && newListTitle.trim()) {
                e.preventDefault();
                void createNewList();
              }
            }}
            placeholder={txt('대분류 이름', 'List name')}
            sx={{ mb: 1.25, '& .MuiOutlinedInput-root': { borderRadius: KANBAN_CONTROL_RADIUS } }}
          />
          <TextField
            fullWidth
            hiddenLabel
            size="small"
            value={newListDescription}
            onChange={(e) => setNewListDescription(e.target.value)}
            placeholder={txt('설명 (선택)', 'Description (optional)')}
            sx={{ mb: 1.25, '& .MuiOutlinedInput-root': { borderRadius: KANBAN_CONTROL_RADIUS } }}
          />
          <TextField
            select
            fullWidth
            hiddenLabel
            size="small"
            value={newListAssigneeUserId ?? ''}
            onChange={(e) =>
              setNewListAssigneeUserId(e.target.value === '' ? null : Number(e.target.value))
            }
            SelectProps={{
              displayEmpty: true,
              renderValue: (selected) => {
                if (selected === '' || selected == null) {
                  return txt('대분류 담당자 (선택)', 'List owner (optional)');
                }
                const m = members.find((mem: any) => mem.user_id === Number(selected));
                return m?.user?.username || `${txt('사용자', 'User')} ${selected}`;
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: KANBAN_CONTROL_RADIUS },
              '& .MuiSelect-select': {
                color: newListAssigneeUserId == null ? 'text.secondary' : 'text.primary',
              },
            }}
          >
            <MenuItem value="">{txt('미지정', 'Unassigned')}</MenuItem>
            {members.map((m: any) => (
              <MenuItem key={m.user_id} value={m.user_id}>
                {m.user?.username || `${txt('사용자', 'User')} ${m.user_id}`}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              if (!creatingList) {
                setAddListOpen(false);
                setNewListTitle('');
                setNewListDescription('');
                setNewListAssigneeUserId(null);
              }
            }}
            disabled={creatingList}
          >
            {txt('취소', 'Cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={() => void createNewList()}
            disabled={creatingList || !newListTitle.trim()}
          >
            {creatingList ? <CircularProgress size={22} /> : txt('추가', 'Add')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={listSettingsOpen}
        onClose={() => {
          if (!listSettingsSaving) {
            setListSettingsOpen(false);
            setListSettingsId(null);
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{txt('대분류 설정', 'List settings')}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {txt(
              '설명과 대분류 담당자를 설정할 수 있습니다. 담당자는 비워둘 수 있습니다.',
              'Set description and optional list owner. Owner can be left empty.'
            )}
          </Typography>
          <TextField
            fullWidth
            hiddenLabel
            size="small"
            value={listSettingsDescription}
            onChange={(e) => setListSettingsDescription(e.target.value)}
            placeholder={txt('설명 (선택)', 'Description (optional)')}
            sx={{ mb: 1.25, '& .MuiOutlinedInput-root': { borderRadius: KANBAN_CONTROL_RADIUS } }}
          />
          <TextField
            select
            fullWidth
            hiddenLabel
            size="small"
            value={listSettingsAssigneeUserId ?? ''}
            onChange={(e) =>
              setListSettingsAssigneeUserId(e.target.value === '' ? null : Number(e.target.value))
            }
            SelectProps={{
              displayEmpty: true,
              renderValue: (selected) => {
                if (selected === '' || selected == null) {
                  return txt('대분류 담당자 (선택)', 'List owner (optional)');
                }
                const m = members.find((mem: any) => mem.user_id === Number(selected));
                return m?.user?.username || `${txt('사용자', 'User')} ${selected}`;
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: KANBAN_CONTROL_RADIUS },
              '& .MuiSelect-select': {
                color: listSettingsAssigneeUserId == null ? 'text.secondary' : 'text.primary',
              },
            }}
          >
            <MenuItem value="">{txt('미지정', 'Unassigned')}</MenuItem>
            {members.map((m: any) => (
              <MenuItem key={m.user_id} value={m.user_id}>
                {m.user?.username || `${txt('사용자', 'User')} ${m.user_id}`}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              if (!listSettingsSaving) {
                setListSettingsOpen(false);
                setListSettingsId(null);
              }
            }}
            disabled={listSettingsSaving}
          >
            {txt('취소', 'Cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={() => void saveListSettings()}
            disabled={listSettingsSaving}
          >
            {listSettingsSaving ? <CircularProgress size={22} /> : txt('저장', 'Save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={completedTasksOpen}
        onClose={() => !reopeningCardId && setCompletedTasksOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {txt('완료된 업무', 'Completed Tasks')} ({completedCards.length})
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            fullWidth
            size="small"
            value={completedTaskSearch}
            onChange={(event) => {
              setCompletedTaskSearch(event.target.value);
              setCompletedTaskPage(1);
            }}
            placeholder={txt(
              '업무명, 내용, 담당자, 작업 지시자 검색',
              'Search title, details, assignee, or creator'
            )}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                bgcolor: '#FFFFFF',
              },
            }}
          />
          {filteredCompletedCards.length === 0 ? (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {completedTaskSearch.trim()
                  ? txt('검색 결과가 없습니다.', 'No completed tasks match your search.')
                  : txt('완료된 업무가 없습니다.', 'There are no completed tasks.')}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {paginatedCompletedCards.map((card) => {
                const creator = members.find(
                  (member: any) => Number(member.user_id) === Number(card.created_by)
                );
                const creatorName =
                  creator?.user?.username ||
                  (card.created_by ? `${txt('사용자', 'User')} ${card.created_by}` : '-');
                const reopenAllowed = canReopenCard(card);
                return (
                  <Box
                    key={card.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (!completedList) return;
                      setCompletedTasksOpen(false);
                      openCardDetail(card, completedList.title, completedList.id);
                    }}
                    onKeyDown={(event) => {
                      if ((event.key === 'Enter' || event.key === ' ') && completedList) {
                        event.preventDefault();
                        setCompletedTasksOpen(false);
                        openCardDetail(card, completedList.title, completedList.id);
                      }
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: '8px',
                      bgcolor: '#FAFBFC',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease, background-color 0.15s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: '#F4F8FA',
                      },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: 2,
                      },
                    }}
                  >
                    <CheckCircleIcon sx={{ color: 'success.main', flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>
                        {card.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {txt('작업 지시자', 'Created by')}: {creatorName}
                        {card.completed_at
                          ? ` · ${txt('완료', 'Completed')}: ${formatDateTime(card.completed_at)}`
                          : ''}
                      </Typography>
                    </Box>
                    <Tooltip
                      title={
                        reopenAllowed
                          ? txt('업무를 다시 진행 상태로 이동합니다.', 'Move this task back to active work.')
                          : txt(
                              '담당자 또는 업무를 지시한 사람만 재오픈할 수 있습니다.',
                              'Only the assignee or task creator can reopen it.'
                            )
                      }
                    >
                      <span>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={
                            !reopenAllowed ||
                            !reopenTargetList?.id ||
                            reopeningCardId === card.id
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleReopenCard(card);
                          }}
                          sx={{ minWidth: 88, borderRadius: '10px', fontWeight: 600 }}
                        >
                          {reopeningCardId === card.id
                            ? <CircularProgress size={16} />
                            : txt('재오픈', 'Reopen')}
                        </Button>
                      </span>
                    </Tooltip>
                  </Box>
                );
              })}
              {completedTaskPageCount > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5 }}>
                  <Pagination
                    count={completedTaskPageCount}
                    page={Math.min(completedTaskPage, completedTaskPageCount)}
                    onChange={(_event, page) => setCompletedTaskPage(page)}
                    color="primary"
                    size="small"
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCompletedTasksOpen(false)}
            disabled={reopeningCardId !== null}
          >
            {txt('닫기', 'Close')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={inviteOpen}
        onClose={() => !inviteLoading && setInviteOpen(false)}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
        slotProps={{
          paper: {
            sx: { overflow: 'visible' },
          },
        }}
      >
        <DialogTitle>{txt('같은 회사 사용자 초대', 'Invite a user from same company')}</DialogTitle>
        <DialogContent sx={{ pt: 2, overflow: 'visible' }}>
          <Typography variant="subtitle2" sx={{ display: 'block', mb: 0.75, fontWeight: 600, fontSize: '0.875rem' }}>
            {txt('사용자 검색', 'Search User')}
          </Typography>
          <Autocomplete
            multiple
            options={inviteUserOptions}
            getOptionLabel={(o) => `${o.username} (${o.userid})`}
            value={selectedUsers}
            onChange={(_e, v) => setSelectedUsers(Array.isArray(v) ? v : [])}
            isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
            openOnFocus
            slotProps={{
              popper: {
                disablePortal: true,
                sx: { zIndex: (theme) => theme.zIndex.modal + 2 },
              },
              listbox: {
                // Dialog 안에서 옵션 mousedown 시 input blur로 목록이 먼저 닫히는 것 방지
                onMouseDown: (e: React.MouseEvent) => {
                  e.preventDefault();
                },
              },
            }}
            renderOption={(props, option) => {
              const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key?: React.Key };
              return (
                <li key={key ?? option.id} {...rest}>
                  {option.username} ({option.userid})
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                hiddenLabel
                placeholder={txt('이름 또는 아이디', 'Name or User ID')}
                onMouseDown={(e) => e.stopPropagation()}
              />
            )}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {txt(
              '이 보드가 속한 회사의 활성 사용자 중, 아직 멤버가 아닌 사용자만 표시됩니다.',
              'Only active users from this board’s company who are not already members are shown.'
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)} disabled={inviteLoading}>
            {txt('닫기', 'Close')}
          </Button>
          <Button variant="contained" onClick={handleInvite} disabled={inviteLoading || selectedUsers.length === 0}>
            {inviteLoading ? <CircularProgress size={22} /> : txt('초대', 'Invite')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={dialogState.open}
        title={dialogState.title}
        titleKey={dialogState.titleKey}
        message={dialogState.message}
        messageKey={dialogState.messageKey}
        confirmText={dialogState.confirmText}
        confirmTextKey={dialogState.confirmTextKey}
        cancelText={dialogState.cancelText}
        cancelTextKey={dialogState.cancelTextKey}
        confirmColor={dialogState.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
};

export default WorkBoardDetailPage;
