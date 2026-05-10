import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { Add as AddIcon, DragIndicator as DragIndicatorIcon } from '@mui/icons-material';
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
import { mvsPageDescriptionSx, mvsPageTitleSx } from '../../theme/mvsLayout';

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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: board.id,
    disabled: !canEdit
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    zIndex: isDragging ? 2 : undefined
  };

  const cardBg = theme.palette.mode === 'light' ? '#FFFFFF' : alpha(theme.palette.grey[900], 0.92);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      elevation={0}
      sx={{
        width: '100%',
        minHeight: 148,
        borderRadius: '16px',
        border: '1px solid',
        borderColor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : alpha(theme.palette.common.white, 0.1),
        borderTop: `4px solid ${accent}`,
        backgroundColor: cardBg,
        boxShadow:
          theme.palette.mode === 'light'
            ? '0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.06)'
            : '0 2px 8px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)',
        overflow: 'hidden',
        transition: 'box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease',
        '&:hover': {
          boxShadow:
            theme.palette.mode === 'light'
              ? '0 2px 4px rgba(0, 0, 0, 0.05), 0 8px 24px rgba(0, 0, 0, 0.09)'
              : '0 8px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)',
          transform: 'translateY(-2px)',
          borderColor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.1)' : alpha(theme.palette.common.white, 0.12),
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
        {canEdit ? (
          <IconButton
            size="small"
            aria-label={isEn ? 'Reorder' : '순서 변경'}
            {...attributes}
            {...listeners}
            sx={{
              cursor: 'grab',
              alignSelf: 'stretch',
              borderRadius: '10px 0 0 10px',
              px: 0.5,
              color: alpha(theme.palette.text.secondary, 0.45),
              touchAction: 'none',
              borderRight: '1px solid',
              borderColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.06)' : alpha(theme.palette.common.white, 0.06),
              '&:hover': { bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.12 : 0.06) },
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <DragIndicatorIcon sx={{ fontSize: '1.125rem' }} />
          </IconButton>
        ) : (
          <Box sx={{ width: 8, flexShrink: 0 }} aria-hidden />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <CardActionArea
            onClick={() => navigate(`/work/projects/${board.id}`)}
            sx={{
              height: '100%',
              borderRadius: 0,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.07 : 0.035),
              },
            }}
          >
            <CardContent
              sx={{
                py: 2,
                px: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                '&:last-child': { pb: 2 },
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  lineHeight: 1.28,
                  letterSpacing: '-0.022em',
                  fontSize: '0.9375rem',
                  color: 'text.primary',
                }}
                gutterBottom
                noWrap
              >
                {board.name}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 1.25,
                  display: 'block',
                  minHeight: '1.35em',
                  lineHeight: 1.4,
                  fontSize: '0.8125rem',
                  fontWeight: 400,
                  opacity: String(board.description || '').trim() ? 0.92 : 0.5,
                }}
                noWrap
              >
                {String(board.description || '').trim() ? board.description : t('workBoards.noDescription')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
                <Chip
                  size="small"
                  variant="outlined"
                  label={t('workBoards.memberCount', { count: board.members?.length ?? 0 })}
                  sx={{
                    height: 24,
                    fontWeight: 500,
                    fontSize: '0.6875rem',
                    letterSpacing: '-0.01em',
                    borderColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.1)' : alpha(theme.palette.common.white, 0.14),
                    bgcolor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.04)' : alpha(theme.palette.common.black, 0.2),
                    color: 'text.secondary',
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
              </Box>
              {canEdit && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    mt: 'auto',
                    pt: 1.25,
                    borderTop: '1px solid',
                    borderColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.06)' : alpha(theme.palette.common.white, 0.08),
                  }}
                >
                  <Button
                    size="small"
                    variant="text"
                    color="primary"
                    sx={{
                      minWidth: 'auto',
                      px: 1,
                      py: 0.5,
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: '10px',
                      color: 'primary.main',
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(board);
                    }}
                  >
                    {isEn ? 'Edit' : '수정'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </CardActionArea>
        </Box>
      </Box>
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

  const pageCanvasBg =
    theme.palette.mode === 'light'
      ? 'linear-gradient(180deg, #F4F5F8 0%, #F0F2F5 100%)'
      : alpha(theme.palette.background.default, 1);
  const pageCanvasSolid = theme.palette.mode === 'light' ? '#F2F3F7' : theme.palette.background.default;

  return (
    <Box
      sx={{
        p: 0,
        width: '100%',
        maxWidth: '100%',
        bgcolor: pageCanvasSolid,
        backgroundImage: theme.palette.mode === 'light' ? pageCanvasBg : 'none',
        borderRadius: { xs: 0, sm: '18px' },
        px: { xs: 2, sm: 2.5 },
        py: { xs: 2, sm: 2.5 },
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          mb: 2.75,
          pb: 2,
          borderBottom: '1px solid',
          borderColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.07)' : alpha(theme.palette.common.white, 0.08),
        }}
      >
        <Box sx={{ flex: '1 1 260px', minWidth: 0 }}>
          <Typography component="h1" sx={{ ...mvsPageTitleSx, mb: 0.75 }}>
            {t('workBoards.title')}
          </Typography>
          <Typography sx={{ ...mvsPageDescriptionSx, maxWidth: 560 }}>
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
              boxShadow: theme.palette.mode === 'light' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {t('workBoards.actions.newBoard')}
          </Button>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
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
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
                gap: { xs: 2, sm: 2.25 },
                alignItems: 'start',
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
              {boards.length === 0 && (
                <Box
                  sx={{
                    gridColumn: '1 / -1',
                    py: 5,
                    px: 2,
                    textAlign: 'center',
                    borderRadius: '16px',
                    border: `1px dashed ${theme.palette.mode === 'light' ? 'rgba(0,0,0,0.14)' : alpha(theme.palette.common.white, 0.2)}`,
                    bgcolor: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.55)' : alpha(theme.palette.common.black, 0.25),
                  }}
                >
                  <Typography color="text.secondary" sx={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
                    {t('workBoards.empty.noBoards')}
                  </Typography>
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
  );
};

export default WorkBoardsPage;
