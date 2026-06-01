import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  CircularProgress,
  Chip,
  Stack,
  Tooltip,
  IconButton
} from '@mui/material';
import FormFieldLabeled from '../../components/Common/FormFieldLabeled';
import {
  Add as AddIcon,
  DragIndicator as DragIndicatorIcon,
  EditOutlined as EditOutlinedIcon,
  GroupsOutlined as GroupsOutlinedIcon,
  ViewKanbanOutlined as ViewKanbanOutlinedIcon
} from '@mui/icons-material';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTheme, alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { workBoardService } from '../../services/api';
import { showErrorPopup } from '../../utils/errorHandler';
import { useMenuStore, useStore } from '../../store';
import { findMenuIdByPath } from '../../utils/findMenuByPath';
import {
  mvsMainSurfaceSx,
  mvsPageDescriptionSx,
  mvsPageShellSx,
  mvsPageTitleSx,
  mvsTitleBlockSx
} from '../../theme/mvsLayout';

/** 보드 색상 — 채도를 낮춘 시스템 톤에 가깝게 */
const BOARD_COLOR_OPTIONS = [
  '#0A84FF',
  '#34C759',
  '#FF9F0A',
  '#BF5AF2',
  '#FF453A',
  '#64D2FF',
  '#5E5CE6',
  '#8E8E93'
] as const;

const isHexColor = (value?: string | null) => Boolean(value && /^#[0-9a-fA-F]{6}$/.test(value));

const getBoardAccentColor = (board: any, fallbackColor: string) => {
  const color = typeof board?.board_color === 'string' ? board.board_color.trim() : '';
  if (isHexColor(color)) {
    return color.toUpperCase();
  }
  return fallbackColor;
};

const getContrastText = (hex: string) => {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#111827' : '#FFFFFF';
};

const getMemberInitial = (member: any) => {
  const label =
    member?.user?.username ||
    member?.user?.userid ||
    member?.user?.email ||
    '';
  const trimmed = String(label).trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
};

const getMemberLabel = (member: any) =>
  member?.user?.username || member?.user?.userid || member?.user?.email || '';

type SortableBoardCardProps = {
  board: any;
  themePrimaryColor: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  isEn: boolean;
  navigate: (path: string) => void;
  onEdit: (board: any) => void;
  canEdit: boolean;
};

const SortableBoardCard: React.FC<SortableBoardCardProps> = ({
  board,
  themePrimaryColor,
  t,
  isEn,
  navigate,
  onEdit,
  canEdit
}) => {
  const theme = useTheme();
  const accent = getBoardAccentColor(board, themePrimaryColor);
  const headerText = getContrastText(accent);
  const members = Array.isArray(board.members) ? board.members : [];
  const previewMembers = members.slice(0, 4);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: board.id,
    disabled: !canEdit
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.72 : 1,
    zIndex: isDragging ? 4 : undefined
  };

  const cardBg = theme.palette.mode === 'light' ? '#FFFFFF' : alpha(theme.palette.grey[900], 0.96);
  const description = String(board.description || '').trim();

  return (
    <Card
      ref={setNodeRef}
      style={style}
      elevation={0}
      sx={{
        width: '100%',
        minHeight: 176,
        borderRadius: '18px',
        border: '1px solid',
        borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : alpha(theme.palette.common.white, 0.1),
        backgroundColor: cardBg,
        boxShadow:
          theme.palette.mode === 'light'
            ? '0 2px 8px rgba(15, 23, 42, 0.05), 0 12px 28px rgba(15, 23, 42, 0.04)'
            : '0 8px 24px rgba(0,0,0,0.35)',
        overflow: 'hidden',
        transition: 'box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease',
        '&:hover': {
          boxShadow:
            theme.palette.mode === 'light'
              ? '0 4px 14px rgba(15, 23, 42, 0.08), 0 18px 36px rgba(15, 23, 42, 0.07)'
              : '0 12px 32px rgba(0,0,0,0.45)',
          transform: 'translateY(-3px)',
          borderColor: alpha(accent, 0.35),
          '& .board-card-actions': { opacity: 1 },
        },
      }}
    >
      <CardActionArea
        onClick={() => navigate(`/work/projects/${board.id}`)}
        sx={{
          height: '100%',
          alignItems: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          '&:hover .MuiCardActionArea-focusHighlight': { opacity: 0.04 },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            px: 2,
            py: 1.75,
            minHeight: 58,
            bgcolor: accent,
            backgroundImage: `linear-gradient(135deg, ${alpha('#FFFFFF', 0.14)} 0%, transparent 55%)`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
          }}
        >
          <ViewKanbanOutlinedIcon sx={{ fontSize: '1.125rem', color: headerText, opacity: 0.88, mt: 0.15 }} />
          <Typography
            variant="subtitle1"
            sx={{
              flex: 1,
              minWidth: 0,
              fontWeight: 700,
              lineHeight: 1.35,
              letterSpacing: '-0.02em',
              fontSize: '0.98rem',
              color: headerText,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {board.name}
          </Typography>
          <Box
            className="board-card-actions"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              opacity: { xs: 1, sm: 0 },
              transition: 'opacity 0.18s ease',
              flexShrink: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {canEdit && (
              <>
                <Tooltip title={isEn ? 'Reorder' : '순서 변경'}>
                  <IconButton
                    size="small"
                    aria-label={isEn ? 'Reorder' : '순서 변경'}
                    {...attributes}
                    {...listeners}
                    sx={{
                      width: 28,
                      height: 28,
                      color: headerText,
                      bgcolor: alpha(headerText, 0.12),
                      touchAction: 'none',
                      cursor: 'grab',
                      '&:hover': { bgcolor: alpha(headerText, 0.2) },
                    }}
                  >
                    <DragIndicatorIcon sx={{ fontSize: '1rem' }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={isEn ? 'Edit' : '수정'}>
                  <IconButton
                    size="small"
                    aria-label={isEn ? 'Edit' : '수정'}
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(board);
                    }}
                    sx={{
                      width: 28,
                      height: 28,
                      color: headerText,
                      bgcolor: alpha(headerText, 0.12),
                      '&:hover': { bgcolor: alpha(headerText, 0.2) },
                    }}
                  >
                    <EditOutlinedIcon sx={{ fontSize: '0.95rem' }} />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>

        <CardContent
          sx={{
            flex: 1,
            py: 2,
            px: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            '&:last-child': { pb: 2 },
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              minHeight: '2.8em',
              lineHeight: 1.55,
              fontSize: '0.8125rem',
              fontWeight: 400,
              opacity: description ? 0.92 : 0.55,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description || t('workBoards.noDescription')}
          </Typography>

          <Box
            sx={{
              mt: 'auto',
              pt: 1.25,
              borderTop: '1px solid',
              borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.06)' : alpha(theme.palette.common.white, 0.08),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            {members.length > 0 ? (
              <AvatarGroup
                max={4}
                sx={{
                  '& .MuiAvatar-root': {
                    width: 28,
                    height: 28,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    border: `2px solid ${cardBg}`,
                  },
                }}
              >
                {previewMembers.map((member: any) => (
                  <Tooltip title={getMemberLabel(member)} key={member.id ?? member.user_id}>
                    <Avatar sx={{ bgcolor: alpha(accent, 0.88), color: getContrastText(accent) }}>
                      {getMemberInitial(member)}
                    </Avatar>
                  </Tooltip>
                ))}
              </AvatarGroup>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.disabled' }}>
                <GroupsOutlinedIcon sx={{ fontSize: '1.05rem' }} />
                <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                  {isEn ? 'No members' : '멤버 없음'}
                </Typography>
              </Box>
            )}
            <Chip
              size="small"
              label={t('workBoards.memberCount', { count: members.length })}
              sx={{
                height: 26,
                fontWeight: 600,
                fontSize: '0.6875rem',
                letterSpacing: '-0.01em',
                borderRadius: '999px',
                bgcolor: theme.palette.mode === 'light' ? '#F1F5F9' : alpha(theme.palette.common.white, 0.06),
                color: 'text.secondary',
                '& .MuiChip-label': { px: 1.1 },
              }}
            />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

const WORK_PROJECTS_ROUTE = '/work/projects';

const WorkBoardsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useStore();
  const { menus, hasMenuPermission } = useMenuStore();
  const workMenuId = useMemo(() => findMenuIdByPath(menus, WORK_PROJECTS_ROUTE), [menus]);
  const isRootUser = user?.role === 'root';
  const canCreateBoard = isRootUser || (workMenuId != null && hasMenuPermission(workMenuId, 'create'));
  const canEditBoard = isRootUser || (workMenuId != null && hasMenuPermission(workMenuId, 'edit'));
  const themePrimaryColor = isHexColor(theme.palette.primary.main)
    ? theme.palette.primary.main.toUpperCase()
    : BOARD_COLOR_OPTIONS[0];
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [boardColor, setBoardColor] = useState<string>(themePrimaryColor);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await workBoardService.getBoards();
      if (res.success) {
        setBoards(res.data || []);
      } else {
        showErrorPopup(res.message || t('workBoards.errors.loadListFailed'), t('workBoards.title'));
      }
    } catch (e: any) {
      showErrorPopup(e, t('workBoards.title'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmitBoard = async () => {
    if (!name.trim()) return;
    if (editingBoardId && !canEditBoard) {
      showErrorPopup(isEn ? 'You do not have permission to edit boards.' : '보드를 수정할 권한이 없습니다.', t('workBoards.title'));
      return;
    }
    if (!editingBoardId && !canCreateBoard) {
      showErrorPopup(isEn ? 'You do not have permission to create boards.' : '보드를 만들 권한이 없습니다.', t('workBoards.title'));
      return;
    }
    setSaving(true);
    try {
      const trimmedDesc = description.trim();
      /** 수정 시: undefined는 JSON에서 키가 빠져 서버가 설명을 갱신하지 못함 — null/문자열로 항상 전달 */

      if (editingBoardId) {
        const updateRes = await workBoardService.updateBoard(editingBoardId, {
          name: name.trim(),
          description: trimmedDesc === '' ? null : trimmedDesc,
          board_color: boardColor
        });
        if (updateRes.success) {
          setOpen(false);
          setEditingBoardId(null);
          await load();
        } else {
          showErrorPopup(updateRes.message || t('workBoards.errors.createFailed'), t('workBoards.title'));
        }
      } else {
        const createRes = await workBoardService.createBoard({
          name: name.trim(),
          description: trimmedDesc === '' ? undefined : trimmedDesc,
          board_color: boardColor
        });
        if (createRes.success && createRes.data?.id) {
          setOpen(false);
          setName('');
          setDescription('');
          setBoardColor(themePrimaryColor);
          navigate(`/work/projects/${createRes.data.id}`);
        } else {
          showErrorPopup(createRes.message || t('workBoards.errors.createFailed'), t('workBoards.title'));
        }
      }
    } catch (e: any) {
      showErrorPopup(e, t('workBoards.title'));
    } finally {
      setSaving(false);
    }
  };

  const openCreateDialog = () => {
    setEditingBoardId(null);
    setName('');
    setDescription('');
    setBoardColor(themePrimaryColor);
    setOpen(true);
  };

  const openEditDialog = (board: any) => {
    setEditingBoardId(board.id);
    setName(board.name || '');
    setDescription(board.description || '');
    setBoardColor(getBoardAccentColor(board, themePrimaryColor));
    setOpen(true);
  };

  const handleBoardDragEnd = async (event: DragEndEvent) => {
    if (!canEditBoard) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = Number(active.id);
    const overId = Number(over.id);
    const activeBoard = boards.find((b) => b.id === activeId);
    const overBoard = boards.find((b) => b.id === overId);
    if (!activeBoard || !overBoard || activeBoard.company_id !== overBoard.company_id) return;

    const sameCo = boards.filter((b) => b.company_id === activeBoard.company_id);
    const oldIndex = sameCo.findIndex((b) => b.id === activeId);
    const newIndex = sameCo.findIndex((b) => b.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(sameCo, oldIndex, newIndex);
    let ri = 0;
    const merged = boards.map((b) => (b.company_id === activeBoard.company_id ? reordered[ri++] : b));
    setBoards(merged);

    try {
      const res = await workBoardService.moveBoard(activeId, newIndex);
      if (!res.success) {
        showErrorPopup(res.message || t('workBoards.errors.reorderFailed'), t('workBoards.title'));
        await load();
      }
    } catch (e: any) {
      showErrorPopup(e, t('workBoards.title'));
      await load();
    }
  };

  return (
    <Box sx={mvsPageShellSx}>
      <Box sx={mvsMainSurfaceSx}>
        <Box
          sx={{
            ...mvsTitleBlockSx,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ flex: '1 1 260px', minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', mb: 0.75 }}>
              <Typography component="h1" sx={{ ...mvsPageTitleSx, mb: 0 }}>
                {t('workBoards.title')}
              </Typography>
              {!loading && boards.length > 0 && (
                <Chip
                  size="small"
                  label={isEn ? `${boards.length} boards` : `보드 ${boards.length}개`}
                  sx={{
                    height: 24,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    bgcolor: '#EEF2FF',
                    color: '#4338CA',
                    border: 'none',
                  }}
                />
              )}
            </Box>
            <Typography sx={{ ...mvsPageDescriptionSx, maxWidth: 620 }}>
              {t('workBoards.description')}
            </Typography>
          </Box>
          {canCreateBoard && (
            <Button
              variant="contained"
              disableElevation
              startIcon={<AddIcon sx={{ fontSize: '1.125rem' }} />}
              onClick={openCreateDialog}
              sx={{
                flexShrink: 0,
                alignSelf: { xs: 'stretch', sm: 'flex-start' },
                borderRadius: '14px',
                px: 2.5,
                py: 1.05,
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: theme.palette.mode === 'light' ? '0 4px 14px rgba(15, 23, 42, 0.08)' : 'none',
              }}
            >
              {t('workBoards.actions.newBoard')}
            </Button>
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={canEditBoard ? handleBoardDragEnd : () => {}}
          >
            <SortableContext items={boards.map((b) => b.id)} strategy={rectSortingStrategy}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(auto-fill, minmax(260px, 1fr))',
                    lg: 'repeat(auto-fill, minmax(280px, 1fr))',
                  },
                  gap: { xs: 2, sm: 2.5 },
                  alignItems: 'stretch',
                }}
              >
                {boards.map((b) => (
                  <SortableBoardCard
                    key={b.id}
                    board={b}
                    themePrimaryColor={themePrimaryColor}
                    t={t}
                    isEn={isEn}
                    navigate={navigate}
                    onEdit={openEditDialog}
                    canEdit={canEditBoard}
                  />
                ))}
                {canCreateBoard && boards.length > 0 && (
                  <Card
                    elevation={0}
                    onClick={openCreateDialog}
                    sx={{
                      minHeight: 176,
                      borderRadius: '18px',
                      border: '2px dashed',
                      borderColor: theme.palette.mode === 'light' ? '#CBD5E1' : alpha(theme.palette.common.white, 0.22),
                      bgcolor: theme.palette.mode === 'light' ? '#F8FAFC' : alpha(theme.palette.common.white, 0.03),
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: theme.palette.mode === 'light' ? '#F1F5F9' : alpha(theme.palette.primary.main, 0.08),
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Stack alignItems="center" spacing={1} sx={{ px: 2, py: 3, textAlign: 'center' }}>
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                        }}
                      >
                        <AddIcon />
                      </Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: 'text.primary' }}>
                        {t('workBoards.actions.newBoard')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 200, lineHeight: 1.5 }}>
                        {isEn ? 'Add another board for your team' : '팀과 함께 쓸 보드를 추가합니다'}
                      </Typography>
                    </Stack>
                  </Card>
                )}
                {boards.length === 0 && (
                  <Box
                    sx={{
                      gridColumn: '1 / -1',
                      py: 6,
                      px: 3,
                      textAlign: 'center',
                      borderRadius: '20px',
                      border: `1px dashed ${theme.palette.mode === 'light' ? '#CBD5E1' : alpha(theme.palette.common.white, 0.2)}`,
                      bgcolor: theme.palette.mode === 'light' ? '#F8FAFC' : alpha(theme.palette.common.black, 0.2),
                    }}
                  >
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        mx: 'auto',
                        mb: 2,
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                      }}
                    >
                      <ViewKanbanOutlinedIcon sx={{ fontSize: '1.75rem' }} />
                    </Box>
                    <Typography color="text.secondary" sx={{ fontSize: '0.9375rem', lineHeight: 1.65, mb: 2.5 }}>
                      {t('workBoards.empty.noBoards')}
                    </Typography>
                    {canCreateBoard && (
                      <Button
                        variant="contained"
                        disableElevation
                        startIcon={<AddIcon />}
                        onClick={openCreateDialog}
                        sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
                      >
                        {t('workBoards.actions.newBoard')}
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            </SortableContext>
          </DndContext>
        )}

      <Dialog
        open={open}
        onClose={() => {
          if (saving) return;
          setOpen(false);
          setEditingBoardId(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle sx={{ pt: 2.5, px: 3, pb: 1, fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          {editingBoardId ? (isEn ? 'Edit Board' : '보드 수정') : t('workBoards.dialog.newBoardTitle')}
        </DialogTitle>
        <DialogContent sx={{ pt: 1, px: 3, pb: 1 }}>
          <Stack spacing={2.5}>
            <FormFieldLabeled
              autoFocus
              fieldLabel={t('workBoards.fields.boardName')}
              requiredMark
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('workBoards.placeholders.boardName')}
            />
            <FormFieldLabeled
              fieldLabel={t('workBoards.fields.descriptionOptional')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('workBoards.placeholders.description')}
              multiline
              minRows={3}
            />
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                {isEn ? 'Board Color' : '보드 색상'}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {[themePrimaryColor, ...BOARD_COLOR_OPTIONS.filter((color) => color !== themePrimaryColor)].map((color) => {
                  const selected = boardColor === color;
                  return (
                    <Tooltip title={color} key={color}>
                      <Button
                        onClick={() => setBoardColor(color)}
                        sx={{
                          minWidth: 0,
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          p: 0,
                          border: selected ? `2px solid ${theme.palette.text.primary}` : '1px solid',
                          borderColor: selected ? theme.palette.text.primary : alpha(theme.palette.divider, 0.9),
                          backgroundColor: color,
                          boxShadow: selected ? `0 0 0 3px ${alpha(color, 0.35)}` : 'none',
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => {
              setOpen(false);
              setEditingBoardId(null);
            }}
            disabled={saving}
            sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmitBoard}
            variant="contained"
            disableElevation
            disabled={saving || !name.trim()}
            sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
          >
            {saving ? <CircularProgress size={22} /> : editingBoardId ? (isEn ? 'Save' : '저장') : t('workBoards.actions.create')}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
};

export default WorkBoardsPage;
