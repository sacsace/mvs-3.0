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
import {
  Add as AddIcon,
  DragIndicator as DragIndicatorIcon,
  Edit as EditIcon,
  ViewKanban as ViewKanbanIcon
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
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { workBoardService } from '../../services/api';
import { showErrorPopup } from '../../utils/errorHandler';
import { useMenuStore, useStore } from '../../store';
import { findMenuIdByPath } from '../../utils/findMenuByPath';

const BOARD_COLOR_OPTIONS = [
  '#1E88E5',
  '#43A047',
  '#FB8C00',
  '#8E24AA',
  '#E53935',
  '#00897B',
  '#5E35B1',
  '#546E7A'
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

  return (
    <Card
      ref={setNodeRef}
      style={style}
      variant="outlined"
      sx={{
        width: '100%',
        minHeight: 118,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        borderRadius: 0.5,
        borderTop: `8px solid ${getBoardAccentColor(board, themePrimaryColor)}`
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
              borderRadius: 0,
              px: 0.25,
              color: 'text.secondary',
              touchAction: 'none'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <DragIndicatorIcon fontSize="small" />
          </IconButton>
        ) : (
          <Box sx={{ width: 8, flexShrink: 0 }} aria-hidden />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <CardActionArea
            onClick={() => navigate(`/work/projects/${board.id}`)}
            sx={{
              height: '100%',
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}
          >
            <CardContent
              sx={{
                p: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                '&:last-child': { pb: 1 }
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} gutterBottom noWrap>
                {board.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  mb: 0.5,
                  display: 'block',
                  minHeight: '1.35em',
                  lineHeight: 1.35,
                  opacity: String(board.description || '').trim() ? 1 : 0.55
                }}
                noWrap
              >
                {String(board.description || '').trim() ? board.description : t('workBoards.noDescription')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap', mt: 0.2 }}>
                <Chip
                  size="small"
                  label={t('workBoards.memberCount', { count: board.members?.length ?? 0 })}
                  sx={{ height: 18, '& .MuiChip-label': { px: 0.75, fontSize: '0.64rem' } }}
                />
              </Box>
              {canEdit && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto' }}>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<EditIcon fontSize="small" />}
                    sx={{ minWidth: 'auto', px: 0.5, py: 0.2, fontSize: '0.68rem' }}
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ViewKanbanIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight={700}>
            {t('workBoards.title')}
          </Typography>
        </Box>
        {canCreateBoard && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
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
                gap: 1.2,
                alignItems: 'start'
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
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography color="text.secondary">{t('workBoards.empty.noBoards')}</Typography>
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
      >
        <DialogTitle>{editingBoardId ? (isEn ? 'Edit Board' : '보드 수정') : t('workBoards.dialog.newBoardTitle')}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
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
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          p: 0,
                          border: selected ? '2px solid #111827' : '1px solid',
                          borderColor: selected ? '#111827' : 'divider',
                          backgroundColor: color
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpen(false);
              setEditingBoardId(null);
            }}
            disabled={saving}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmitBoard} variant="contained" disabled={saving || !name.trim()}>
            {saving ? <CircularProgress size={22} /> : editingBoardId ? (isEn ? 'Save' : '저장') : t('workBoards.actions.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkBoardsPage;
