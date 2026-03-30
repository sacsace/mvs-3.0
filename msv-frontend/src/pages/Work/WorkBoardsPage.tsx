import React, { useCallback, useEffect, useState } from 'react';
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
  Tooltip
} from '@mui/material';
import FormFieldLabeled from '../../components/Common/FormFieldLabeled';
import { Add as AddIcon, Edit as EditIcon, ViewKanban as ViewKanbanIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { workBoardService } from '../../services/api';
import { showErrorPopup } from '../../utils/errorHandler';

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

const WorkBoardsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
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
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        board_color: boardColor
      };

      if (editingBoardId) {
        const updateRes = await workBoardService.updateBoard(editingBoardId, payload);
        if (updateRes.success) {
          setOpen(false);
          setEditingBoardId(null);
          await load();
        } else {
          showErrorPopup(updateRes.message || t('workBoards.errors.createFailed'), t('workBoards.title'));
        }
      } else {
        const createRes = await workBoardService.createBoard(payload);
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ViewKanbanIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight={700}>
            {t('workBoards.title')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
        >
          {t('workBoards.actions.newBoard')}
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 300px))',
            gap: 1.2,
            justifyContent: 'flex-start'
          }}
        >
          {boards.map((b) => (
            <Card
              key={b.id}
              variant="outlined"
              sx={{
                width: 300,
                height: 100,
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                borderRadius: 0.5,
                borderTop: `8px solid ${getBoardAccentColor(b, themePrimaryColor)}`
              }}
            >
              <CardActionArea
                onClick={() => navigate(`/work/projects/${b.id}`)}
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
                    {b.name}
                  </Typography>
                  {b.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }} noWrap>
                      {b.description}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap', mt: 0.2 }}>
                    <Chip
                      size="small"
                      label={t('workBoards.memberCount', { count: b.members?.length ?? 0 })}
                      sx={{ height: 18, '& .MuiChip-label': { px: 0.75, fontSize: '0.64rem' } }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto' }}>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<EditIcon fontSize="small" />}
                      sx={{ minWidth: 'auto', px: 0.5, py: 0.2, fontSize: '0.68rem' }}
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditDialog(b);
                      }}
                    >
                      수정
                    </Button>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
          {boards.length === 0 && (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography color="text.secondary">{t('workBoards.empty.noBoards')}</Typography>
            </Box>
          )}
        </Box>
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
        <DialogTitle>{editingBoardId ? '보드 수정' : t('workBoards.dialog.newBoardTitle')}</DialogTitle>
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
                보드 색상
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
            {saving ? <CircularProgress size={22} /> : editingBoardId ? '저장' : t('workBoards.actions.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkBoardsPage;
