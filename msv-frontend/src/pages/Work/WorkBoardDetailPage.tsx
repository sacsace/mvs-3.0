import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useNavigate, useParams } from 'react-router-dom';
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { api, workBoardService } from '../../services/api';
import { useStore } from '../../store';
import { showErrorPopup, showSuccessPopup, showSuccessToast } from '../../utils/errorHandler';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import ReactQuill, { Quill } from 'react-quill';
import ImageResize from 'quill-image-resize-module-react';
import 'react-quill/dist/quill.snow.css';
import { useTheme } from '@mui/material/styles';

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
  content: string;
  created_at?: string;
  user?: { id: number; username?: string; userid?: string };
};

type CardDetailState = {
  cardId: number;
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

const DRAG_TRANSITION = 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease';

const isHexColor = (value?: string | null): value is string => Boolean(value && /^#[0-9a-fA-F]{6}$/.test(value));

const hexToRgba = (hex: string, alphaValue: number) => {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alphaValue})`;
};

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

function DraggableCard({
  card,
  onOpenDetail
}: {
  card: BoardCard;
  onOpenDetail: (card: BoardCard) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card-${card.id}`,
    data: { card }
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
        opacity: isDragging ? 0.45 : 1
      }
    : { opacity: isDragging ? 0.45 : 1 };

  return (
    <Card
      ref={setCardNodeRef}
      variant="outlined"
      sx={{
        width: '100%',
        mb: 1,
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        bgcolor: 'background.paper',
        borderColor: 'divider',
        borderRadius: 0.8,
        overflow: 'hidden',
        transition: DRAG_TRANSITION,
        willChange: 'transform',
        zIndex: isDragging ? 20 : 1,
        ...style
      }}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (!isDragging) onOpenDetail(card);
      }}
    >
      {card.color && (
        <Box
          sx={{
            height: 8,
            width: '100%',
            bgcolor: card.color
          }}
        />
      )}
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="subtitle2" color="text.primary">{card.title}</Typography>
        {card.description && !isRichTextEmpty(card.description) && (
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }} color="text.secondary">
            {getPlainTextFromHtml(card.description).slice(0, 120)}
            {getPlainTextFromHtml(card.description).length > 120 ? '…' : ''}
          </Typography>
        )}
        {card.assignee && (
          <Chip size="small" label={card.assignee.username} sx={{ mt: 0.5 }} variant="outlined" />
        )}
        {card.due_date && (
          <Chip
            size="small"
            label={`만료: ${formatDueDate(card.due_date)}`}
            sx={{ mt: 0.5, ml: card.assignee ? 0.5 : 0 }}
            variant="outlined"
          />
        )}
      </CardContent>
    </Card>
  );
}

function ListColumn({
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
  onOpenCardDetail
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
  onStartEditListTitle: () => void;
  onSaveListTitle: () => void;
  onDeleteList: () => void;
  onComposerTitleChange: (v: string) => void;
  onComposerDescChange: (v: string) => void;
  onOpenComposer: () => void;
  onCloseComposer: () => void;
  onSubmitCard: () => void;
  savingCard: boolean;
  onOpenCardDetail: (card: BoardCard, listTitle: string, listId: number) => void;
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
    data: { listId: list.id }
  });
  const cards = list.cards || [];

  const setColumnRef = (node: HTMLElement | null) => {
    setCardDropRef(node);
    setListDropRef(node);
    setListDragRef(node);
  };

  const listStyle = listTransform
    ? {
        transform: `translate3d(${listTransform.x}px, ${listTransform.y}px, 0)`,
        opacity: isListDragging ? 0.82 : 1
      }
    : { opacity: isListDragging ? 0.82 : 1 };

  return (
    <Paper
      ref={setColumnRef}
      elevation={0}
      sx={{
        width: 320,
        minWidth: 320,
        maxWidth: 320,
        flex: '0 0 320px',
        bgcolor: isOver ? 'action.hover' : 'background.paper',
        p: 1.25,
        borderRadius: 1.5,
        border: 'none',
        boxShadow: 'none',
        alignSelf: 'flex-start',
        minHeight: 120,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 220px)',
        transition: DRAG_TRANSITION,
        willChange: 'transform',
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
          aria-label="대분류 드래그 이동"
          sx={{ cursor: 'grab' }}
          {...listDragAttributes}
          {...listDragListeners}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
        {listTitleEditing ? (
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
            {list.title}
          </Typography>
        )}
        {listTitleEditing ? (
          <IconButton
            size="small"
            onClick={onSaveListTitle}
            disabled={listSaving || !listTitleDraft.trim()}
            aria-label="제목 저장"
          >
            <CheckIcon fontSize="small" />
          </IconButton>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <IconButton size="small" onClick={onStartEditListTitle} aria-label="제목 수정">
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={onDeleteList} aria-label="대분류 삭제">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
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
            onOpenDetail={(card) => onOpenCardDetail(card, list.title, list.id)}
          />
        ))}
      </Box>

      {composerOpen ? (
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
            placeholder="제목"
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
            placeholder="설명 (선택)"
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
              {savingCard ? <CircularProgress size={18} color="inherit" /> : '카드 추가'}
            </Button>
            <IconButton size="small" onClick={onCloseComposer} aria-label="취소">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      ) : (
        <Button
          fullWidth
          size="small"
          startIcon={<AddIcon />}
          onClick={onOpenComposer}
          sx={{
            mt: 1,
            justifyContent: 'flex-start',
            color: 'text.secondary',
            textTransform: 'none',
            py: 0.75,
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          카드 추가
        </Button>
      )}
    </Paper>
  );
}

const WorkBoardDetailPage: React.FC = () => {
  const theme = useTheme();
  const { boardId: boardIdParam } = useParams();
  const boardId = Number(boardIdParam);
  const navigate = useNavigate();
  const { user } = useStore();
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();

  const [board, setBoard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);

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
  const quillRef = useRef<ReactQuill | null>(null);
  const commentInputRef = useRef<HTMLInputElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
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

  const loadUsers = async () => {
    try {
      const res = await api.get('/users');
      if (res.data?.success) {
        const list = (res.data.data || []).filter((u: any) => u.id !== user?.id && u.status === 'active');
        setCompanyUsers(list);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDragStart = (event: { active: { id: string | number } }) => {
    const id = String(event.active.id);
    if (!id.startsWith('card-')) return;
    const cid = parseInt(id.replace('card-', ''), 10);
    const lists: BoardList[] = board?.lists || [];
    for (const l of lists) {
      const c = (l.cards || []).find((x) => x.id === cid);
      if (c) {
        setActiveCard(c);
        return;
      }
    }
  };

  const handleDragCancel = () => {
    setActiveCard(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
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

      try {
        const res = await workBoardService.moveList(boardId, activeListId, targetIndex);
        if (res.success) {
          await loadBoard();
        } else {
          showErrorPopup(res.message || '대분류 이동 실패', '작업 보드');
        }
      } catch (e: any) {
        showErrorPopup(e, '작업 보드');
      }
      return;
    }

    if (!activeIdStr.startsWith('card-')) return;
    const activeCardId = parseInt(activeIdStr.replace('card-', ''), 10);
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

    try {
      const res = await workBoardService.moveCard(boardId, activeCardId, targetListId, targetIndex);
      if (res.success) {
        await loadBoard();
      } else {
        showErrorPopup(res.message || '이동 실패', '작업 보드');
      }
    } catch (e: any) {
      showErrorPopup(e, '작업 보드');
    }
  };

  const submitCard = async () => {
    if (!composerListId || !composerTitle.trim()) return;
    setSavingCard(true);
    try {
      const res = await workBoardService.createCard(boardId, composerListId, {
        title: composerTitle.trim(),
        description: composerDesc.trim() || undefined
      });
      if (res.success) {
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
  };

  const openComposer = (listId: number) => {
    setComposerListId(listId);
    setComposerTitle('');
    setComposerDesc('');
  };

  const closeComposer = () => {
    setComposerListId(null);
    setComposerTitle('');
    setComposerDesc('');
  };

  const startEditListTitle = (list: BoardList) => {
    setEditingListId(list.id);
    setEditingListTitle(list.title);
  };

  const saveListTitle = async () => {
    if (!editingListId) return;
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
  };

  const deleteList = async (listId: number, listTitle: string) => {
    showConfirm(
      `"${listTitle}" 대분류와 하위 카드를 삭제하시겠습니까?`,
      () => {
        void (async () => {
          try {
            const res = await workBoardService.deleteList(boardId, listId);
            if (res.success) {
              showSuccessToast('대분류가 삭제되었습니다.');
              if (editingListId === listId) {
                setEditingListId(null);
                setEditingListTitle('');
              }
              await loadBoard();
            } else {
              showErrorPopup(res.message || '대분류 삭제 실패', '업무 보드');
            }
          } catch (error: any) {
            showErrorPopup(error, '업무 보드');
          }
        })();
      },
      { title: '대분류 삭제', confirmText: '삭제', confirmColor: 'error' }
    );
  };

  const createNewList = async () => {
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

  const openCardDetail = (card: BoardCard, listTitle: string, listId: number) => {
    setCardDetail({
      cardId: card.id,
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
    setCardComments((card.comments || []).slice().sort((a, b) => {
      const ta = new Date(a.created_at || '').getTime() || 0;
      const tb = new Date(b.created_at || '').getTime() || 0;
      return ta - tb;
    }));
    setNewComment('');
    setMentionedUserIds([]);
    setMentionOpen(false);
    setMentionQuery('');
    setMentionHighlightIndex(0);
  };

  const loadCardComments = useCallback(
    async (cardId: number) => {
      setCommentLoading(true);
      try {
        const res = await workBoardService.getCardComments(boardId, cardId);
        if (res.success) {
          setCardComments((res.data || []).slice().sort((a: BoardCardComment, b: BoardCardComment) => {
            const ta = new Date(a.created_at || '').getTime() || 0;
            const tb = new Date(b.created_at || '').getTime() || 0;
            return ta - tb;
          }));
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
    loadCardComments(cardDetail.cardId);
  }, [cardDetail?.cardId, loadCardComments]);

  const submitComment = async () => {
    if (!cardDetail?.cardId || !newComment.trim()) return;
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
        mentionUserIds
      );
      if (res.success && res.data) {
        setCardComments((prev) => [...prev, res.data]);
        setNewComment('');
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
    setCommentDeletingId(commentId);
    try {
      const res = await workBoardService.deleteCardComment(boardId, cardDetail.cardId, commentId);
      if (res.success) {
        setCardComments((prev) => prev.filter((c) => c.id !== commentId));
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
    setMentionedUserIds([]);
    setMentionOpen(false);
    setMentionQuery('');
    setMentionHighlightIndex(0);
  };

  const persistCardDetail = async (forcedListId?: number, successMessage?: string) => {
    if (!cardDetail) return;
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
    if (!cardDetail) return;
    if (!completedList?.id) {
      showErrorPopup('완료 상태로 이동할 목록(예: 완료)이 없습니다.', '업무 종료');
      return;
    }
    await persistCardDetail(completedList.id, '업무가 종료되었습니다.');
  };

  const handleDeleteCard = () => {
    if (!cardDetail?.cardId) return;
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
  const canManageMembers = isOwner;
  const canDeleteBoard = myMember?.role === 'owner';
  const boardAccentColor =
    isHexColor(board?.board_color) && board.board_color
      ? board.board_color.toUpperCase()
      : (isHexColor(theme.palette.primary.main) ? theme.palette.primary.main.toUpperCase() : '#1976D2');
  const lists: BoardList[] = [...(board?.lists || [])].sort((a, b) => a.position - b.position);
  const completedList = lists.find((list) => isCompletedListTitle(list.title));
  const members = (board?.members || []) as any[];
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

  const isCommentEnabled = !!cardDetail?.title?.trim() && !!cardDetail?.listId;

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
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        overflowY: 'auto',
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
        <Button startIcon={<PersonAddIcon />} variant="outlined" onClick={() => { setInviteOpen(true); loadUsers(); }}>
          멤버 초대
        </Button>
        {canDeleteBoard && (
          <Button color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={handleDeleteBoard}>
            보드 삭제
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
          보드 멤버 · {members.length}명
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          {members.map((m: any) => {
            const name = m.user?.username || `사용자 ${m.user_id}`;
            const initial = name.trim().charAt(0).toUpperCase() || '?';
            const isSelf = Number(m.user_id) === Number(user?.id || 0);
            const isOwnerMember = m.role === 'owner';
            const canRemoveMember = (canManageMembers || isSelf) && !isOwnerMember;
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
                    {m.role === 'owner' ? '소유자' : '멤버'}
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
                    <MenuItem value="member">멤버</MenuItem>
                    <MenuItem value="owner">소유자</MenuItem>
                  </TextField>
                  <Button
                    size="small"
                    color="error"
                    variant="text"
                    disabled={!canRemoveMember || memberRemovingId === Number(m.user_id)}
                    onClick={() => handleRemoveMember(Number(m.user_id), name)}
                  >
                    {memberRemovingId === Number(m.user_id) ? '삭제 중...' : '삭제'}
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
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                flexWrap: 'nowrap',
                justifyContent: 'flex-start',
                gap: 2,
                overflowX: 'auto',
                overflowY: 'hidden',
                alignItems: 'flex-start',
                pb: 1.5,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                '&::-webkit-scrollbar': {
                  display: 'none'
                }
              }}
            >
            {lists.map((list) => (
              <ListColumn
                key={list.id}
                list={list}
                accentColor={boardAccentColor}
                listTitleEditing={editingListId === list.id}
                listTitleDraft={editingListId === list.id ? editingListTitle : list.title}
                listSaving={listSaving}
                composerOpen={composerListId === list.id}
                composerTitle={composerTitle}
                composerDesc={composerDesc}
                onListTitleDraftChange={setEditingListTitle}
                onStartEditListTitle={() => startEditListTitle(list)}
                onSaveListTitle={saveListTitle}
                onDeleteList={() => deleteList(list.id, list.title)}
                onComposerTitleChange={setComposerTitle}
                onComposerDescChange={setComposerDesc}
                onOpenComposer={() => openComposer(list.id)}
                onCloseComposer={closeComposer}
                onSubmitCard={submitCard}
                savingCard={savingCard}
                onOpenCardDetail={openCardDetail}
              />
            ))}
              <Paper
                elevation={0}
                sx={{
                  width: 320,
                  minWidth: 320,
                  maxWidth: 320,
                  flex: '0 0 320px',
                  p: 1.5,
                  borderRadius: 2,
                  alignSelf: 'flex-start',
                  border: '1px dashed',
                  borderColor: 'divider',
                  bgcolor: 'background.paper'
                }}
              >
              <Typography fontWeight={700} sx={{ mb: 1 }} color="text.primary">
                + 대분류 추가
              </Typography>
              <TextField
                fullWidth
                hiddenLabel
                size="small"
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                placeholder="예: 검토 대기"
                sx={{ mb: 1 }}
              />
              <Button
                fullWidth
                variant="contained"
                size="small"
                onClick={createNewList}
                disabled={creatingList || !newListTitle.trim()}
              >
                {creatingList ? <CircularProgress size={18} color="inherit" /> : '대분류 추가'}
              </Button>
              </Paper>
            </Box>
          </Box>
          <DragOverlay
            dropAnimation={{
              duration: 220,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
            }}
          >
            {activeCard ? (
              <Card
                variant="outlined"
                sx={{
                  width: 260,
                  boxShadow: 8,
                  borderRadius: 1.5
                }}
              >
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="subtitle2">{activeCard.title}</Typography>
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {cardDetail && (
        <Paper
          elevation={0}
          sx={{
            mt: 1.5,
            height: 'auto',
            maxHeight: 'none',
            borderRadius: 2,
            boxShadow: 'none',
            overflow: 'hidden',
            border: 'none',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            py: 1.2,
            px: 2
          }}
        >
          <Button
            size="small"
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={closeCardDetail}
            sx={{ borderRadius: 999, minWidth: 96 }}
          >
            뒤로 가기
          </Button>
          <Box sx={{ minWidth: 0, ml: 0.5 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              카드 세부사항
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            size="small"
            color="error"
            variant="outlined"
            onClick={handleDeleteCard}
            disabled={cardSaving || !cardDetail?.cardId}
            sx={{ borderRadius: 999, minWidth: 84 }}
          >
            카드 삭제
          </Button>
          <Button
            size="small"
            color="success"
            variant="outlined"
            onClick={completeTask}
            disabled={
              cardSaving ||
              !cardDetail?.title?.trim() ||
              !completedList?.id ||
              cardDetail?.listId === completedList?.id
            }
            sx={{ borderRadius: 999, minWidth: 84 }}
          >
            {cardDetail?.listId === completedList?.id ? '종료됨' : '업무 종료'}
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={saveCardDetail}
            disabled={cardSaving || !cardDetail?.title?.trim()}
            sx={{ borderRadius: 999, minWidth: 72 }}
          >
            {cardSaving ? <CircularProgress size={18} color="inherit" /> : '저장'}
          </Button>
        </Box>
        <Box
          sx={{
            pt: 1,
            px: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            bgcolor: 'background.paper',
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
            제목
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
            placeholder="카드 제목"
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
                목록
              </Typography>
              <TextField
                select
                fullWidth
                hiddenLabel
                size="small"
                variant="outlined"
                value={cardDetail?.listId || ''}
                onChange={(e) =>
                  setCardDetail((prev) =>
                    prev ? { ...prev, listId: Number(e.target.value) } : prev
                  )
                }
              >
                {lists.map((list) => (
                  <MenuItem key={list.id} value={list.id}>
                    {list.title}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.4 }}>
                담당자
              </Typography>
              <TextField
                select
                fullWidth
                hiddenLabel
                size="small"
                variant="outlined"
                value={cardDetail?.assigneeUserId ?? ''}
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
                <MenuItem value="">미지정</MenuItem>
                {members.map((m: any) => (
                  <MenuItem key={m.user_id} value={m.user_id}>
                    {m.user?.username || `사용자 ${m.user_id}`}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.4 }}>
                만료일
              </Typography>
              <TextField
                type="date"
                fullWidth
                hiddenLabel
                size="small"
                variant="outlined"
                value={cardDetail?.dueDate || ''}
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
              참조자
            </Typography>
            <Autocomplete
              multiple
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
                <TextField {...params} size="small" hiddenLabel placeholder="참조할 사용자 선택" />
              )}
            />
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, mb: 0.4 }}>
            카드 색상
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.6 }}>
            <TextField
              type="color"
              hiddenLabel
              variant="outlined"
              size="small"
              value={cardDetail?.color || '#1976D2'}
              onChange={(e) =>
                setCardDetail((prev) => (prev ? { ...prev, color: e.target.value } : prev))
              }
              sx={{ width: 44 }}
            />
            <Button
              size="small"
              variant={!cardDetail?.color ? 'contained' : 'outlined'}
              onClick={() =>
                setCardDetail((prev) => (prev ? { ...prev, color: '' } : prev))
              }
              sx={{ borderRadius: 999, minWidth: 48 }}
            >
              기본
            </Button>
            {CARD_COLOR_PRESETS.map((hex) => (
              <Button
                key={hex}
                size="small"
                variant={cardDetail?.color === hex ? 'contained' : 'outlined'}
                onClick={() =>
                  setCardDetail((prev) => (prev ? { ...prev, color: hex } : prev))
                }
                sx={{
                  minWidth: 24,
                  width: 24,
                  height: 24,
                  p: 0,
                  borderRadius: '50%',
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
            설명
          </Typography>
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'hidden',
              '& .ql-toolbar.ql-snow': {
                border: 'none',
                borderBottom: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper'
              },
              '& .ql-container.ql-snow': {
                border: 'none',
                minHeight: 180,
                backgroundColor: 'background.paper'
              },
              '& .ql-editor': {
                minHeight: 130,
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
              value={cardDetail?.description || ''}
              onChange={(value) =>
                setCardDetail((prev) => (prev ? { ...prev, description: value } : prev))
              }
              modules={quillModules}
              formats={quillFormats}
              placeholder="설명을 입력하세요. 이미지 업로드, 글자 크기/색상 변경이 가능합니다."
            />
          </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 1.25,
              borderRadius: 1.5,
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              bgcolor: 'background.paper'
            }}
          >
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            댓글 및 활동
          </Typography>
          <Box
            sx={{
              display: 'flex',
              mb: 1,
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
              placeholder="댓글을 입력하세요"
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
              {commentSaving ? <CircularProgress size={18} color="inherit" /> : '댓글'}
            </Button>
          </Box>
          {!isCommentEnabled && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              먼저 제목/목록 등 기본 정보를 입력해 주세요.
            </Typography>
          )}
          <Paper
            elevation={0}
            sx={{
              p: 1,
              minHeight: 120,
              overflowY: 'visible',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            {commentLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={20} />
              </Box>
            ) : cardComments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                아직 댓글이 없습니다.
              </Typography>
            ) : (
              cardComments.map((comment) => {
                const canDelete = isOwner || comment.user_id === user?.id || user?.role === 'root';
                return (
                  <Box
                    key={comment.id}
                    sx={{
                      px: 0.5,
                      py: 0.75,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none', pb: 0 }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {(comment.user?.username || '알 수 없는 사용자')} · {formatDateTime(comment.created_at)}
                      </Typography>
                      {canDelete && (
                        <Button
                          size="small"
                          color="error"
                          onClick={() => {
                            void removeComment(comment.id);
                          }}
                          disabled={commentDeletingId === comment.id}
                        >
                          {commentDeletingId === comment.id ? '삭제 중...' : '삭제'}
                        </Button>
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {comment.content}
                    </Typography>
                  </Box>
                );
              })
            )}
          </Paper>
          </Paper>
        </Box>
      </Paper>
      )}

      <Dialog open={inviteOpen} onClose={() => !inviteLoading && setInviteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>같은 회사 사용자 초대</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="subtitle2" sx={{ display: 'block', mb: 0.75, fontWeight: 600, fontSize: '0.875rem' }}>
            사용자 검색
          </Typography>
          <Autocomplete
            options={companyUsers}
            getOptionLabel={(o) => `${o.username} (${o.userid})`}
            value={selectedUser}
            onChange={(_e, v) => setSelectedUser(v)}
            renderInput={(params) => (
              <TextField {...params} variant="outlined" hiddenLabel placeholder="이름 또는 아이디" />
            )}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            같은 회사(테넌트)에 속한 활성 사용자만 표시됩니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)} disabled={inviteLoading}>
            닫기
          </Button>
          <Button variant="contained" onClick={handleInvite} disabled={inviteLoading || !selectedUser}>
            {inviteLoading ? <CircularProgress size={22} /> : '초대'}
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
