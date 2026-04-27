import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
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
  IconButton,
  MenuItem,
  Popper,
  Paper,
  TextField,
  Typography,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  DragIndicator as DragIndicatorIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditOutlinedIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  closestCenter,
  closestCorners,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MeasuringFrequency,
  MeasuringStrategy,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { restrictToWindowEdges, snapCenterToCursor } from '@dnd-kit/modifiers';
import { api, workBoardService } from '../../services/api';
import { useMenuStore, useStore } from '../../store';
import { findMenuIdByPath } from '../../utils/findMenuByPath';
import { showErrorPopup, showSuccessPopup, showSuccessToast } from '../../utils/errorHandler';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import ReactQuill, { Quill } from 'react-quill';
import ImageResize from 'quill-image-resize-module-react';
import 'react-quill/dist/quill.snow.css';
import { alpha, useTheme } from '@mui/material/styles';

if (typeof window !== 'undefined' && !(window as any).Quill) {
  (window as any).Quill = Quill;
}

if (!(Quill as any).imports['modules/imageResize']) {
  Quill.register('modules/imageResize', ImageResize);
}

const BaseImageFormat = Quill.import('formats/image');
class ExtendedImageFormat extends (BaseImageFormat as any) {
  static formats(domNode: HTMLElement) {
    const formats = ((BaseImageFormat as any).formats?.(domNode) || {}) as Record<string, string>;
    const width = domNode.getAttribute('width') || domNode.style.width;
    const height = domNode.getAttribute('height') || domNode.style.height;
    const style = domNode.getAttribute('style');
    if (width) formats.width = width;
    if (height) formats.height = height;
    if (style) formats.style = style;
    return formats;
  }

  format(name: string, value: unknown) {
    if (name === 'width' || name === 'height') {
      if (value) {
        this.domNode.setAttribute(name, String(value));
        (this.domNode.style as any)[name] = String(value);
      } else {
        this.domNode.removeAttribute(name);
        (this.domNode.style as any)[name] = '';
      }
      return;
    }
    if (name === 'style') {
      if (value) {
        this.domNode.setAttribute('style', String(value));
      } else {
        this.domNode.removeAttribute('style');
      }
      return;
    }
    super.format(name, value);
  }
}

Quill.register(ExtendedImageFormat as any, true);

type BoardList = {
  id: number;
  title: string;
  position: number;
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
  assignee?: { id: number; username: string };
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
  '#455A64',
  '#6D4C41'
];

const COMPLETED_LIST_KEYWORDS = ['완료', '종료', 'done', 'completed', 'closed'];

const isCompletedListTitle = (title?: string): boolean => {
  const normalized = String(title || '').trim().toLowerCase();
  if (!normalized) return false;
  return COMPLETED_LIST_KEYWORDS.some((keyword) => normalized.includes(keyword));
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

const DRAG_TRANSITION = 'transform 90ms cubic-bezier(0.2, 0, 0, 1)';

/** 칸반 카드 고정 높이(열·드래그 미리보기 동일) */
const WORK_BOARD_CARD_HEIGHT_PX = 158;

/** 대분류(열) 기본 너비 — flex-grow 없이 고정해 행에 열이 적어도 카드 너비가 동일하게 유지 */
const WORK_BOARD_COLUMN_WIDTH_PX = 280;

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
          color: 'primary.main',
          fontWeight: 600,
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
          px: 0.35,
          borderRadius: 0.5
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
  for (const l of lists) {
    const row = l.cards ?? [];
    const i = row.findIndex((c: BoardCard) => c.id === activeCardId);
    if (i >= 0) {
      moved = row[i];
      row.splice(i, 1);
      l.cards = row;
      break;
    }
  }
  if (!moved) return board;

  const target = lists.find((l: BoardList) => l.id === targetListId);
  if (!target) return board;

  const filtered = (target.cards ?? []).filter((c: BoardCard) => c.id !== activeCardId);
  const insertAt = Math.min(Math.max(0, targetIndex), filtered.length);
  filtered.splice(insertAt, 0, moved);
  target.cards = filtered;

  return { ...board, lists };
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

const DraggableCard = memo(function DraggableCard({
  card,
  onOpenDetail,
  txt,
  dragDisabled
}: {
  card: BoardCard;
  onOpenDetail: (card: BoardCard) => void;
  txt: (ko: string, en: string) => string;
  dragDisabled?: boolean;
}) {
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

  return (
    <Card
      ref={setCardNodeRef}
      square
      variant="outlined"
      sx={{
        width: '100%',
        height: WORK_BOARD_CARD_HEIGHT_PX,
        display: 'flex',
        flexDirection: 'column',
        mb: 1,
        cursor: dragDisabled ? 'pointer' : 'grab',
        touchAction: dragDisabled ? undefined : 'none',
        userSelect: 'none',
        bgcolor: 'background.paper',
        borderColor: 'divider',
        borderRadius: 0,
        overflow: 'hidden',
        transition: isDragging ? 'none' : DRAG_TRANSITION,
        willChange: isDragging ? 'transform' : 'auto',
        zIndex: isDragging ? 20 : 1,
        ...style
      }}
      {...(dragDisabled ? {} : listeners)}
      {...(dragDisabled ? {} : attributes)}
      onClick={() => {
        if (!isDragging) onOpenDetail(card);
      }}
    >
      <Box
        sx={{
          height: 8,
          width: '100%',
          flexShrink: 0,
          bgcolor: card.color || 'transparent'
        }}
      />
      <CardContent
        sx={{
          flex: 1,
          minHeight: 0,
          py: 1,
          px: 1.5,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          '&:last-child': { pb: 1 }
        }}
      >
        <Typography
          variant="subtitle2"
          color="text.primary"
          sx={{
            flexShrink: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
            lineHeight: 1.35
          }}
        >
          {card.title || '\u00a0'}
        </Typography>
        <Box sx={{ flex: 1, minHeight: 0, mt: 0.5, overflow: 'hidden' }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
              lineHeight: 1.35
            }}
          >
            {descPlain || '\u200b'}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.5,
            alignItems: 'center',
            mt: 'auto',
            pt: 0.5,
            flexShrink: 0,
            maxHeight: 52,
            overflow: 'hidden'
          }}
        >
          {card.assignee && <Chip size="small" label={card.assignee.username} variant="outlined" />}
          {card.due_date && (
            <Chip
              size="small"
              label={`${txt('만료', 'Due')}: ${formatDueDate(card.due_date)}`}
              variant="outlined"
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
});

const ListColumn = memo(function ListColumn({
  list,
  accentColor,
  listTitleEditing,
  listTitleDraft,
  listSaving,
  composerOpen,
  composerTitle,
  composerDesc,
  onListTitleDraftChange,
  onStartEditListTitle,
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
  allowAddCard
}: {
  list: BoardList;
  accentColor: string;
  listTitleEditing: boolean;
  listTitleDraft: string;
  listSaving: boolean;
  composerOpen: boolean;
  composerTitle: string;
  composerDesc: string;
  onListTitleDraftChange: (v: string) => void;
  onStartEditListTitle: (listId: number) => void;
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
}) {
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
      sx={{
        boxSizing: 'border-box',
        flex: { xs: '1 1 100%', sm: `0 0 ${WORK_BOARD_COLUMN_WIDTH_PX}px` },
        width: { xs: '100%', sm: `${WORK_BOARD_COLUMN_WIDTH_PX}px` },
        minWidth: { xs: 0, sm: WORK_BOARD_COLUMN_WIDTH_PX },
        maxWidth: { xs: '100%', sm: `${WORK_BOARD_COLUMN_WIDTH_PX}px` },
        bgcolor: 'background.paper',
        outline: isOver ? '2px dashed' : 'none',
        outlineColor: 'primary.main',
        outlineOffset: -2,
        p: 1.25,
        borderRadius: 1.5,
        border: 'none',
        boxShadow: 'none',
        alignSelf: 'flex-start',
        minHeight: 120,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 220px)',
        transition: isListDragging ? 'none' : DRAG_TRANSITION,
        willChange: isListDragging ? 'transform' : 'auto',
        zIndex: isListDragging ? 10 : 1,
        ...listStyle
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          mb: 1.1,
          px: 0.75,
          py: 0.55,
          borderRadius: 1,
          border: '1px solid',
          borderColor: hexToRgba(accentColor, 0.35),
          backgroundColor: hexToRgba(accentColor, 0.14)
        }}
      >
        <IconButton
          size="small"
          aria-label={txt('대분류 드래그 이동', 'Drag list')}
          sx={{ cursor: allowListReorder ? 'grab' : 'default' }}
          {...(allowListReorder ? listDragAttributes : {})}
          {...(allowListReorder ? listDragListeners : {})}
          disabled={!allowListReorder}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
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
          <Typography fontWeight={700} sx={{ flex: 1 }} color="text.primary">
            {displayBoardListTitle(list.title, language)}
          </Typography>
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
        ) : (
          (allowListTitleEdit || allowListDelete) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              {allowListTitleEdit && (
                <IconButton
                  size="small"
                  onClick={() => onStartEditListTitle(list.id)}
                  aria-label={txt('제목 수정', 'Edit title')}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              )}
              {allowListDelete && (
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDeleteList(list.id, list.title)}
                  aria-label={txt('대분류 삭제', 'Delete list')}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          )
        )}
      </Box>
      <Box
        sx={{
          overflowY: 'auto',
          flex: 1,
          minHeight: 0,
          pr: 0.5,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }}
      >
        {cards.map((c) => (
          <DraggableCard
            key={c.id}
            card={c}
            txt={txt}
            onOpenDetail={handleOpenCard}
            dragDisabled={!allowListReorder}
          />
        ))}
      </Box>

      {allowAddCard && composerOpen ? (
        <Paper
          variant="outlined"
          sx={{
            mt: 1,
            p: 1,
            bgcolor: 'background.paper',
            borderRadius: 1,
            borderColor: 'divider',
            boxShadow: 'none'
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Button
              size="small"
              variant="contained"
              onClick={onSubmitCard}
              disabled={savingCard || !composerTitle.trim()}
            >
              {savingCard ? <CircularProgress size={18} color="inherit" /> : txt('카드 추가', 'Add Card')}
            </Button>
            <IconButton size="small" onClick={onCloseComposer} aria-label={txt('취소', 'Cancel')}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      ) : allowAddCard ? (
        <Button
          fullWidth
          size="small"
          startIcon={<AddIcon />}
          onClick={() => onOpenComposer(list.id)}
          sx={{
            mt: 1,
            justifyContent: 'flex-start',
            color: 'text.secondary',
            textTransform: 'none',
            py: 0.75,
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          {txt('카드 추가', 'Add Card')}
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
  const { user } = useStore();
  const { language, menus, hasMenuPermission } = useMenuStore();
  const txt = useCallback((ko: string, en: string) => (language === 'en' ? en : ko), [language]);
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
  const [creatingList, setCreatingList] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [memberRoleUpdatingId, setMemberRoleUpdatingId] = useState<number | null>(null);
  const [memberRemovingId, setMemberRemovingId] = useState<number | null>(null);
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
  const quillRef = useRef<ReactQuill | null>(null);
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  /** 칸반 인라인으로 마지막 생성된 카드 id — 세부 화면에서 한 번 저장하기 전까지 댓글 잠금 */
  const lastQuickCreatedCardIdRef = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 0 }
    })
  );

  const loadBoard = useCallback(async () => {
    if (!boardId || Number.isNaN(boardId)) return;
    setLoading(true);
    try {
      const res = await workBoardService.getBoard(boardId);
      if (res.success) {
        setBoard(normalizeBoardData(res.data));
      } else {
        showErrorPopup(res.message || '불러올 수 없습니다.', '작업 보드');
      }
    } catch (e: any) {
      showErrorPopup(e, '작업 보드');
    } finally {
      setLoading(false);
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
      const res = await api.get('/users', { params });
      if (res.data?.success) {
        const list = (res.data.data || []).filter((u: any) => {
          if (u.id === user?.id || u.status !== 'active') return false;
          if (Number(u.company_id) !== boardCompanyId) return false;
          if (
            boardTenantId != null &&
            Number.isInteger(boardTenantId) &&
            u.tenant_id != null &&
            Number(u.tenant_id) !== boardTenantId
          ) {
            return false;
          }
          return true;
        });
        setCompanyUsers(list);
      }
    } catch (e) {
      console.error(e);
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

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    setActiveList(null);
    if (!menuCanEdit) return;
    const { active, over } = event;
    if (!over || !board) return;

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

      if (!targetListId || targetListId === activeListId) return;
      const orderedLists = [...lists].sort((a, b) => a.position - b.position);
      const targetIndex = orderedLists.findIndex((l) => l.id === targetListId);
      if (targetIndex < 0) return;

      const prevBoard = board;
      setBoard((p: any) => normalizeBoardData(applyOptimisticListMove(p, activeListId, targetIndex)));
      try {
        const res = await workBoardService.moveList(boardId, activeListId, targetIndex);
        if (!res.success) {
          setBoard(normalizeBoardData(prevBoard));
          showErrorPopup(res.message || '대분류 이동 실패', '작업 보드');
        }
      } catch (e: any) {
        setBoard(normalizeBoardData(prevBoard));
        showErrorPopup(e, '작업 보드');
      }
      return;
    }

    if (!activeIdStr.startsWith('card-')) return;
    const activeCardId = parseInt(activeIdStr.replace('card-', ''), 10);

    if (overId.startsWith('card-')) {
      const overCardIdEarly = parseInt(overId.replace('card-', ''), 10);
      if (overCardIdEarly === activeCardId) return;
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
      if (!found) return;
      targetListId = found.id;
      const filtered = (found.cards || []).filter((c) => c.id !== activeCardId);
      const idx = filtered.findIndex((c) => c.id === overCardId);
      targetIndex = idx >= 0 ? idx : filtered.length;
    } else {
      return;
    }

    const before = findCardPositionInBoard(board, activeCardId);
    if (
      before &&
      before.listId === targetListId &&
      before.index === targetIndex
    ) {
      return;
    }

    const prevBoard = board;
    setBoard((p: any) => normalizeBoardData(applyOptimisticCardMove(p, activeCardId, targetListId, targetIndex)));
    try {
      const res = await workBoardService.moveCard(boardId, activeCardId, targetListId, targetIndex);
      if (!res.success) {
        setBoard(normalizeBoardData(prevBoard));
        showErrorPopup(res.message || '이동 실패', '작업 보드');
      }
    } catch (e: any) {
      setBoard(normalizeBoardData(prevBoard));
      showErrorPopup(e, '작업 보드');
    }
  };

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
        const newId = Number((res.data as { id?: number })?.id);
        if (Number.isInteger(newId) && newId > 0) {
          lastQuickCreatedCardIdRef.current = newId;
        }
        setComposerListId(null);
        setComposerTitle('');
        setComposerDesc('');
        await loadBoard();
      } else {
        showErrorPopup(res.message || '실패', '작업 보드');
      }
    } catch (e: any) {
      showErrorPopup(e, '작업 보드');
    } finally {
      setSavingCard(false);
    }
  }, [boardId, composerListId, composerTitle, composerDesc, loadBoard, menuCanCreate, txt]);

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
      const res = await workBoardService.createList(boardId, { title: newListTitle.trim() });
      if (!res.success) {
        showErrorPopup(res.message || '대분류 추가 실패', '업무 보드');
        return;
      }
      setNewListTitle('');
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
    const latestEditorHtml = quillRef.current?.getEditor?.().root?.innerHTML;
    const descriptionForSave =
      typeof latestEditorHtml === 'string' && latestEditorHtml.length > 0
        ? latestEditorHtml
        : cardDetail.description;
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
        txt('업무 종료', 'Complete task')
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
        '업무 종료는 담당자 또는 보드 소유자만 할 수 있습니다.',
        '업무 종료'
      );
      return;
    }
    if (!completedList?.id) {
      showErrorPopup(
        '완료 상태로 이동할 목록이 없습니다. 보드에 목록을 하나 더 추가하거나, 이름에 「완료」「종료」「Done」 등이 들어가는 열을 만드세요.',
        '업무 종료'
      );
      return;
    }
    await persistCardDetail(completedList.id, '업무가 종료되었습니다.');
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
      '이 카드를 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.',
      () => {
        void (async () => {
          setCardSaving(true);
          try {
            const res = await workBoardService.deleteCard(boardId, cardDetail.cardId);
            if (res.success) {
              closeCardDetail();
              await loadBoard();
              showSuccessToast('카드가 삭제되었습니다.');
            } else {
              showErrorPopup(res.message || '카드 삭제에 실패했습니다.', '카드 세부사항');
            }
          } catch (error: any) {
            showErrorPopup(error, '카드 세부사항');
          } finally {
            setCardSaving(false);
          }
        })();
      },
      { title: '카드 삭제', confirmText: '삭제', confirmColor: 'error' }
    );
  };

  const handleInvite = async () => {
    if (!selectedUser?.id) return;
    if (!menuCanEdit) {
      showErrorPopup(
        txt('멤버를 초대할 권한이 없습니다.', 'You do not have permission to invite members.'),
        txt('작업 보드', 'Work board')
      );
      return;
    }
    setInviteLoading(true);
    try {
      const res = await workBoardService.inviteMember(boardId, selectedUser.id);
      if (res.success) {
        showSuccessToast('초대되었습니다.');
        setInviteOpen(false);
        setSelectedUser(null);
        await loadBoard();
      } else {
        showErrorPopup(res.message || '초대 실패', '작업 보드');
      }
    } catch (e: any) {
      showErrorPopup(e, '작업 보드');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleChangeMemberRole = async (memberUserId: number, nextRole: 'owner' | 'member') => {
    if (!menuCanEdit) return;
    setMemberRoleUpdatingId(memberUserId);
    try {
      const res = await workBoardService.updateMemberRole(boardId, memberUserId, nextRole);
      if (res.success) {
        showSuccessToast('멤버 권한이 변경되었습니다.');
        await loadBoard();
      } else {
        showErrorPopup(res.message || '멤버 권한 변경 실패', '작업 보드');
      }
    } catch (e: any) {
      showErrorPopup(e, '작업 보드');
    } finally {
      setMemberRoleUpdatingId(null);
    }
  };

  const handleRemoveMember = (memberUserId: number, memberName: string) => {
    if (!menuCanEdit) return;
    showConfirm(
      `"${memberName}" 사용자를 보드에서 제거하시겠습니까?`,
      () => {
        void (async () => {
          setMemberRemovingId(memberUserId);
          try {
            const res = await workBoardService.removeMember(boardId, memberUserId);
            if (res.success) {
              showSuccessToast('멤버가 제거되었습니다.');
              await loadBoard();
            } else {
              showErrorPopup(res.message || '멤버 제거 실패', '작업 보드');
            }
          } catch (e: any) {
            showErrorPopup(e, '작업 보드');
          } finally {
            setMemberRemovingId(null);
          }
        })();
      },
      { title: '멤버 제거', confirmText: '제거', confirmColor: 'error' }
    );
  };

  const handleDeleteBoard = () => {
    showConfirm(
      '이 작업 보드와 모든 목록·카드가 삭제됩니다. 계속할까요?',
      () => {
        void (async () => {
          try {
            const res = await workBoardService.deleteBoard(boardId);
            if (res.success) {
              showSuccessPopup('삭제되었습니다.');
              navigate('/work/projects');
            } else {
              showErrorPopup(res.message || '삭제 실패', '작업 보드');
            }
          } catch (e: any) {
            showErrorPopup(e, '작업 보드');
          }
        })();
      },
      { title: '작업 보드 삭제', confirmText: '삭제', confirmColor: 'error' }
    );
  };

  const quillModules = useMemo(
    () => ({
      imageResize: {
        modules: ['Resize'],
        displayStyles: {
          display: 'none'
        },
        toolbarStyles: {
          display: 'none'
        }
      },
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          [{ size: ['small', false, 'large', 'huge'] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ align: [] }],
          ['blockquote', 'code-block'],
          ['link', 'image'],
          ['clean']
        ],
        handlers: {
          image: () => {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');
            input.click();
            input.onchange = () => {
              const file = input.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const editor = quillRef.current?.getEditor();
                if (!editor) return;
                const range = editor.getSelection(true);
                editor.insertEmbed(range?.index ?? 0, 'image', reader.result as string, 'user');
                editor.setSelection((range?.index ?? 0) + 1, 0);
              };
              reader.readAsDataURL(file);
            };
          }
        }
      }
    }),
    []
  );

  const quillFormats = useMemo(
    () => [
      'header',
      'size',
      'bold',
      'italic',
      'underline',
      'strike',
      'color',
      'background',
      'list',
      'bullet',
      'align',
      'blockquote',
      'code-block',
      'link',
      'image',
      'width',
      'height',
      'style'
    ],
    []
  );

  const myMember = board?.members?.find((m: any) => m.user_id === user?.id);
  const isOwner = myMember?.role === 'owner' || user?.role === 'root';
  const canManageMembers = isOwner && menuCanEdit;
  const canDeleteBoard = myMember?.role === 'owner' && menuCanDelete;
  const boardAccentColor =
    isHexColor(board?.board_color) && board.board_color
      ? board.board_color.toUpperCase()
      : (isHexColor(theme.palette.primary.main) ? theme.palette.primary.main.toUpperCase() : '#1976D2');
  const lists: BoardList[] = [...(board?.lists || [])].sort((a, b) => a.position - b.position);
  /** 제목에 완료/종료/done 등이 없으면 칸반이 2열 이상일 때 마지막 열을 완료 이동 목적으로 사용 */
  const completedListByTitle = lists.find((list) => isCompletedListTitle(list.title));
  const completedList =
    completedListByTitle ?? (lists.length >= 2 ? lists[lists.length - 1] : undefined);
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
      sx={{
        p: 2,
        pb: 2,
        width: '100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        backgroundColor: 'background.paper',
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/work/projects')} size="small" aria-label="목록으로">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={700} color="text.primary">
          {board.name}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {menuCanEdit && (
          <Button startIcon={<PersonAddIcon />} variant="outlined" onClick={() => { setInviteOpen(true); loadUsers(); }}>
            {txt('멤버 초대', 'Invite Member')}
          </Button>
        )}
        {canDeleteBoard && (
          <Button color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={handleDeleteBoard}>
            {txt('보드 삭제', 'Delete Board')}
          </Button>
        )}
      </Box>

      <Paper
        elevation={0}
        sx={{
          mb: 2,
          p: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }} color="text.primary">
          {txt('보드 멤버', 'Board Members')} · {members.length}{txt('명', '')}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          {members.map((m: any) => {
            const name = m.user?.username || `${txt('사용자', 'User')} ${m.user_id}`;
            const initial = name.trim().charAt(0).toUpperCase() || '?';
            const isSelf = Number(m.user_id) === Number(user?.id || 0);
            const isOwnerMember = m.role === 'owner';
            const canRemoveMember = menuCanEdit && (canManageMembers || isSelf) && !isOwnerMember;
            return (
              <Box
                key={m.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  minWidth: 0,
                  pr: 1
                }}
              >
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: m.role === 'owner' ? 'primary.main' : 'grey.400',
                    fontSize: '1rem',
                    fontWeight: 600
                  }}
                >
                  {initial}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap color="text.primary">
                    {name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {m.role === 'owner' ? txt('소유자', 'Owner') : txt('멤버', 'Member')}
                    {m.user?.userid ? ` · ${m.user.userid}` : ''}
                  </Typography>
                </Box>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <TextField
                    select
                    hiddenLabel
                    size="small"
                    value={m.role}
                    disabled={!canManageMembers || memberRoleUpdatingId === Number(m.user_id)}
                    onChange={(e) => {
                      const nextRole = e.target.value as 'owner' | 'member';
                      if (nextRole !== m.role) {
                        void handleChangeMemberRole(Number(m.user_id), nextRole);
                      }
                    }}
                    sx={{ minWidth: 94 }}
                  >
                    <MenuItem value="member">{txt('멤버', 'Member')}</MenuItem>
                    <MenuItem value="owner">{txt('소유자', 'Owner')}</MenuItem>
                  </TextField>
                  <Button
                    size="small"
                    color="error"
                    variant="text"
                    disabled={!canRemoveMember || memberRemovingId === Number(m.user_id)}
                    onClick={() => handleRemoveMember(Number(m.user_id), name)}
                  >
                    {memberRemovingId === Number(m.user_id) ? txt('삭제 중...', 'Deleting...') : txt('삭제', 'Delete')}
                  </Button>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {board.description && (
        <Typography variant="body2" sx={{ mb: 2 }} color="text.secondary">
          {board.description}
        </Typography>
      )}

      {!cardDetail && (
        <DndContext
          sensors={sensors}
          collisionDetection={kanbanCollisionDetection}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.WhileDragging,
              frequency: MeasuringFrequency.Optimized
            }
          }}
          onDragStart={handleDragStart}
          onDragCancel={handleDragCancel}
          onDragEnd={menuCanEdit ? handleDragEnd : () => {}}
        >
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              display: 'flex',
              overflow: 'visible',
              width: '100%'
            }}
          >
            <Box
              sx={{
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'flex-start',
                alignContent: 'flex-start',
                gap: { xs: 1.5, sm: 2 },
                alignItems: 'stretch',
                pb: 1
              }}
            >
            {lists.map((list) => (
              <ListColumn
                key={list.id}
                list={list}
                accentColor={boardAccentColor}
                txt={txt}
                language={language}
                listTitleEditing={editingListId === list.id}
                listTitleDraft={editingListId === list.id ? editingListTitle : list.title}
                listSaving={listSaving}
                composerOpen={composerListId === list.id}
                composerTitle={composerTitle}
                composerDesc={composerDesc}
                onListTitleDraftChange={setEditingListTitle}
                onStartEditListTitle={startEditListTitleById}
                onSaveListTitle={saveListTitle}
                onDeleteList={deleteList}
                onComposerTitleChange={setComposerTitle}
                onComposerDescChange={setComposerDesc}
                onOpenComposer={openComposer}
                onCloseComposer={closeComposer}
                onSubmitCard={submitCard}
                savingCard={savingCard}
                onOpenCardDetail={openCardDetail}
                allowListReorder={menuCanEdit}
                allowListTitleEdit={menuCanEdit}
                allowListDelete={menuCanDelete}
                allowAddCard={menuCanCreate}
              />
            ))}
              {menuCanCreate && (
              <Paper
                elevation={0}
                sx={{
                  boxSizing: 'border-box',
                  flex: { xs: '1 1 100%', sm: `0 0 ${WORK_BOARD_COLUMN_WIDTH_PX}px` },
                  width: { xs: '100%', sm: `${WORK_BOARD_COLUMN_WIDTH_PX}px` },
                  minWidth: { xs: 0, sm: WORK_BOARD_COLUMN_WIDTH_PX },
                  maxWidth: { xs: '100%', sm: `${WORK_BOARD_COLUMN_WIDTH_PX}px` },
                  p: 1.5,
                  borderRadius: 2,
                  alignSelf: 'flex-start',
                  border: '1px dashed',
                  borderColor: 'divider',
                  bgcolor: 'background.paper'
                }}
              >
              <Typography fontWeight={700} sx={{ mb: 1 }} color="text.primary">
                + {txt('대분류 추가', 'Add List')}
              </Typography>
              <TextField
                fullWidth
                hiddenLabel
                size="small"
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                placeholder={txt('예: 검토 대기', 'e.g. Pending Review')}
                sx={{ mb: 1 }}
              />
              <Button
                fullWidth
                variant="contained"
                size="small"
                onClick={createNewList}
                disabled={creatingList || !newListTitle.trim()}
              >
                {creatingList ? <CircularProgress size={18} color="inherit" /> : txt('대분류 추가', 'Add List')}
              </Button>
              </Paper>
              )}
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
                square
                variant="outlined"
                sx={{
                  width: 'min(292px, 85vw)',
                  maxWidth: 292,
                  height: WORK_BOARD_CARD_HEIGHT_PX,
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: 12,
                  borderRadius: 0,
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  cursor: 'grabbing',
                  touchAction: 'none',
                  transform: 'translateZ(0)',
                  willChange: 'transform',
                  overflow: 'hidden'
                }}
              >
                <Box
                  sx={{
                    height: 8,
                    width: '100%',
                    flexShrink: 0,
                    bgcolor: activeCard.color || 'transparent'
                  }}
                />
                <CardContent
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    py: 1,
                    px: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    '&:last-child': { pb: 1 }
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    color="text.primary"
                    sx={{
                      flexShrink: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      wordBreak: 'break-word',
                      lineHeight: 1.35
                    }}
                  >
                    {activeCard.title || '\u00a0'}
                  </Typography>
                  <Box sx={{ flex: 1, minHeight: 0, mt: 0.5, overflow: 'hidden' }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        wordBreak: 'break-word',
                        lineHeight: 1.35
                      }}
                    >
                      {activeCard.description && !isRichTextEmpty(activeCard.description)
                        ? getPlainTextFromHtml(activeCard.description)
                        : '\u200b'}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.5,
                      alignItems: 'center',
                      mt: 'auto',
                      pt: 0.5,
                      flexShrink: 0,
                      maxHeight: 52,
                      overflow: 'hidden'
                    }}
                  >
                    {activeCard.assignee && (
                      <Chip size="small" label={activeCard.assignee.username} variant="outlined" />
                    )}
                    {activeCard.due_date && (
                      <Chip
                        size="small"
                        label={`${txt('만료', 'Due')}: ${formatDueDate(activeCard.due_date)}`}
                        variant="outlined"
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            ) : activeList ? (
              <Paper
                elevation={8}
                sx={{
                  width: 'min(292px, 85vw)',
                  maxWidth: 292,
                  boxSizing: 'border-box',
                  p: 1.5,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  cursor: 'grabbing',
                  touchAction: 'none',
                  transform: 'translateZ(0)',
                  willChange: 'transform'
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 0.75,
                    py: 0.75,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: hexToRgba(boardAccentColor, 0.35),
                    backgroundColor: hexToRgba(boardAccentColor, 0.14)
                  }}
                >
                  <DragIndicatorIcon fontSize="small" color="action" />
                  <Typography fontWeight={700} color="text.primary" noWrap sx={{ flex: 1 }}>
                    {activeList.title}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {txt(
                    `${(activeList.cards || []).length}개의 카드`,
                    `${(activeList.cards || []).length} cards`
                  )}
                </Typography>
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
              height: 'auto',
              maxHeight: 'none',
              borderRadius: 0.5,
              boxShadow: 'none',
              overflow: 'hidden',
              border: 'none',
              borderLeft: `4px solid ${accent}`,
              bgcolor: alpha(accent, theme.palette.mode === 'dark' ? 0.12 : 0.07),
              display: 'flex',
              flexDirection: 'column'
            };
          }}
        >
        <Box
          sx={(theme) => {
            const custom = cardDetail.color?.trim();
            const accent = custom || theme.palette.primary.main;
            return {
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: alpha(accent, theme.palette.mode === 'dark' ? 0.18 : 0.12),
              py: 1,
              px: 2
            };
          }}
        >
          <Button
            size="small"
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={closeCardDetail}
            sx={{ borderRadius: 999, minWidth: 96 }}
          >
            {txt('뒤로 가기', 'Back')}
          </Button>
          <Box sx={{ minWidth: 0, ml: 0.5 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {txt('카드 세부사항', 'Card Details')}
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          {menuCanDelete && (
            <Button
              size="small"
              color="error"
              variant="outlined"
              onClick={handleDeleteCard}
              disabled={cardSaving || !cardDetail?.cardId}
              sx={{ borderRadius: 999, minWidth: 84 }}
            >
              {txt('카드 삭제', 'Delete Card')}
            </Button>
          )}
          <Button
            size="small"
            color="success"
            variant="outlined"
            onClick={completeTask}
            disabled={
              !menuCanEdit ||
              cardSaving ||
              !cardDetail?.title?.trim() ||
              !completedList?.id ||
              cardDetail?.listId === completedList?.id ||
              !canUserCompleteTask
            }
            sx={{ borderRadius: 999, minWidth: 84 }}
          >
            {cardDetail?.listId === completedList?.id ? txt('종료됨', 'Completed') : txt('업무 종료', 'Complete Task')}
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={saveCardDetail}
            disabled={!menuCanEdit || cardSaving || !cardDetail?.title?.trim()}
            sx={{ borderRadius: 999, minWidth: 72 }}
          >
            {cardSaving ? <CircularProgress size={18} color="inherit" /> : txt('저장', 'Save')}
          </Button>
        </Box>
        <Box
          sx={{
            pt: 1,
            px: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            bgcolor: 'transparent',
            overflowY: 'visible',
            overflowX: 'hidden',
            minHeight: 'auto'
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 1.25,
              flexShrink: 0,
              borderRadius: 1.5,
              bgcolor: 'background.paper'
            }}
          >
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            {txt('제목', 'Title')}
          </Typography>
          <TextField
            fullWidth
            hiddenLabel
            size="small"
            variant="outlined"
            value={cardDetail?.title || ''}
            onChange={(e) =>
              setCardDetail((prev) =>
                prev ? { ...prev, title: e.target.value } : prev
              )
            }
            disabled={!menuCanEdit}
              placeholder={txt('카드 제목', 'Card Title')}
            sx={{ mb: 1 }}
          />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: 1
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.4 }}>
                {txt('목록', 'List')}
              </Typography>
              <TextField
                select
                fullWidth
                hiddenLabel
                size="small"
                variant="outlined"
                value={cardDetail?.listId || ''}
                disabled={!menuCanEdit}
                onChange={(e) =>
                  setCardDetail((prev) =>
                    prev ? { ...prev, listId: Number(e.target.value) } : prev
                  )
                }
              >
                {lists.map((list) => (
                  <MenuItem key={list.id} value={list.id}>
                    {displayBoardListTitle(list.title, language)}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.4 }}>
                {txt('담당자', 'Assignee')}
              </Typography>
              <TextField
                select
                fullWidth
                hiddenLabel
                size="small"
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
              >
                <MenuItem value="">{txt('미지정', 'Unassigned')}</MenuItem>
                {members.map((m: any) => (
                  <MenuItem key={m.user_id} value={m.user_id}>
                    {m.user?.username || `${txt('사용자', 'User')} ${m.user_id}`}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.4 }}>
                {txt('만료일', 'Due Date')}
              </Typography>
              <TextField
                type="date"
                fullWidth
                hiddenLabel
                size="small"
                variant="outlined"
                value={cardDetail?.dueDate || ''}
                disabled={!menuCanEdit}
                onChange={(e) =>
                  setCardDetail((prev) =>
                    prev ? { ...prev, dueDate: e.target.value } : prev
                  )
                }
              />
            </Box>
          </Box>

          <Box sx={{ mt: 0.8 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.4 }}>
              {txt('참조자', 'References')}
            </Typography>
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
                  <Chip size="small" label={option.label} {...getTagProps({ index })} key={option.id} />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} size="small" hiddenLabel placeholder={txt('참조할 사용자 선택', 'Select reference users')} />
              )}
            />
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, mb: 0.4 }}>
            {txt('카드 색상', 'Card Color')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.6 }}>
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
                '& .MuiOutlinedInput-root': { borderRadius: 0.5, p: 0.25 },
                '& input[type="color"]': {
                  borderRadius: 0.5,
                  cursor: 'pointer',
                  minHeight: 28
                }
              }}
            />
            <Button
              size="small"
              variant={!cardDetail?.color ? 'contained' : 'outlined'}
              disabled={!menuCanEdit}
              onClick={() =>
                setCardDetail((prev) => (prev ? { ...prev, color: '' } : prev))
              }
              sx={{ borderRadius: 999, minWidth: 48 }}
            >
              {txt('기본', 'Default')}
            </Button>
            {CARD_COLOR_PRESETS.map((hex) => (
              <Button
                key={hex}
                size="small"
                variant={cardDetail?.color === hex ? 'contained' : 'outlined'}
                disabled={!menuCanEdit}
                onClick={() =>
                  setCardDetail((prev) => (prev ? { ...prev, color: hex } : prev))
                }
                sx={{
                  minWidth: 24,
                  width: 24,
                  height: 24,
                  p: 0,
                  borderRadius: 0.5,
                  borderColor: hex,
                  bgcolor: cardDetail?.color === hex ? hex : 'transparent',
                  '&:hover': { bgcolor: hex, opacity: 0.85 }
                }}
              />
            ))}
          </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 1.25,
              flexShrink: 0,
              borderRadius: 1.5,
              bgcolor: 'background.paper'
            }}
          >
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            {txt('설명', 'Description')}
          </Typography>
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              /* 주의: .ql-snow는 툴바·컨테이너 둘 다에 붙으므로 flex column을 쓰면 툴바 버튼이 세로로 쌓임 */
              '& .ql-toolbar.ql-snow': {
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                width: '100%',
                border: 'none',
                borderBottom: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                '& .ql-formats': {
                  display: 'inline-flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }
              },
              '& .ql-container.ql-snow': {
                border: 'none',
                resize: 'vertical',
                overflow: 'auto',
                minHeight: 160,
                maxHeight: 'min(78vh, 900px)',
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: 'background.paper',
                display: 'block'
              },
              '& .ql-editor': {
                minHeight: 120,
                overflowY: 'auto',
                fontSize: '0.9rem'
              },
              '& .ql-editor img': {
                maxWidth: '100%',
                height: 'auto',
                display: 'block'
              },
              '& .ql-editor .ql-align-center img': {
                marginLeft: 'auto',
                marginRight: 'auto'
              },
              '& .ql-editor .ql-align-right img': {
                marginLeft: 'auto',
                marginRight: 0
              },
              '& .ql-editor .ql-align-left img': {
                marginLeft: 0,
                marginRight: 'auto'
              },
              '& .ql-image-resize-display': {
                display: 'none !important'
              },
              '& .ql-image-resize-toolbar': {
                display: 'none !important'
              }
            }}
          >
            <ReactQuill
              ref={quillRef}
              theme="snow"
              readOnly={!menuCanEdit}
              value={cardDetail?.description || ''}
              onChange={(value) =>
                setCardDetail((prev) => (prev ? { ...prev, description: value } : prev))
              }
              modules={quillModules}
              formats={quillFormats}
              placeholder={txt('설명을 입력하세요. 이미지 업로드, 글자 크기/색상 변경이 가능합니다.', 'Enter description. Image upload and text size/color changes are available.')}
            />
          </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 1,
              borderRadius: 1.5,
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              bgcolor: 'background.paper'
            }}
          >
          <Typography variant="subtitle2" sx={{ mb: 0.35 }}>
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
                mb: 0.5,
                py: 0.35,
                px: 0.75,
                borderRadius: 1,
                bgcolor: 'action.hover'
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
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'background.paper'
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
                  '& fieldset': {
                    border: 'none'
                  }
                }
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
                minWidth: 64,
                borderRadius: 0,
                boxShadow: 'none',
                borderLeft: '1px solid',
                borderColor: 'divider'
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
              p: 0.75,
              minHeight: 96,
              overflowY: 'visible',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            {commentLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.25 }}>
                <CircularProgress size={20} />
              </Box>
            ) : cardComments.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
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
                      px: 0.25,
                      py: 0.35,
                      pl: isReply ? 2 : 0.25,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      borderLeft: isReply ? '2px solid' : 'none',
                      borderLeftColor: isReply ? 'divider' : 'transparent',
                      '&:last-child': { borderBottom: 'none', pb: 0 }
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
                          alignItems: 'baseline',
                          gap: 0.75,
                          flex: 1,
                          minWidth: 0
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="span"
                          sx={{ flexShrink: 0, lineHeight: 1.35 }}
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
                            lineHeight: 1.35,
                            flex: 1,
                            minWidth: 0
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

      <Dialog open={inviteOpen} onClose={() => !inviteLoading && setInviteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{txt('같은 회사 사용자 초대', 'Invite a user from same company')}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="subtitle2" sx={{ display: 'block', mb: 0.75, fontWeight: 600, fontSize: '0.875rem' }}>
            {txt('사용자 검색', 'Search User')}
          </Typography>
          <Autocomplete
            options={companyUsers}
            getOptionLabel={(o) => `${o.username} (${o.userid})`}
            value={selectedUser}
            onChange={(_e, v) => setSelectedUser(v)}
            renderInput={(params) => (
              <TextField {...params} variant="outlined" hiddenLabel placeholder={txt('이름 또는 아이디', 'Name or User ID')} />
            )}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {txt(
              '이 보드가 속한 회사의 활성 사용자만 표시됩니다.',
              'Only active users from the company this board belongs to are shown.'
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)} disabled={inviteLoading}>
            {txt('닫기', 'Close')}
          </Button>
          <Button variant="contained" onClick={handleInvite} disabled={inviteLoading || !selectedUser}>
            {inviteLoading ? <CircularProgress size={22} /> : txt('초대', 'Invite')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={dialogState.open}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        confirmColor={dialogState.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
};

export default WorkBoardDetailPage;
