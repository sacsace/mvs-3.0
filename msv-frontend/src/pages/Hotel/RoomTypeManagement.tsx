import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  FormControl,
  Select,
  MenuItem,
  InputAdornment
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { roomTypeService } from '../../services/api';

type RoomType = {
  id: number;
  name: string;
  count: number;
  nightlyRate: number;
  description: string;
  isActive: boolean;
  createdAt: string;
};

const RoomTypeManagement: React.FC = () => {
  const { t } = useTranslation();
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    count: '',
    nightlyRate: '',
    description: '',
    isActive: true
  });

  const loadRoomTypes = async () => {
    try {
      const response = await roomTypeService.getRoomTypes();
      if (response.success) {
        const mapped = (response.data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          count: Number(item.room_count || 0),
          nightlyRate: Number(item.nightly_rate || 0),
          description: item.description || '',
          isActive: Boolean(item.is_active),
          createdAt: item.created_at || new Date().toISOString(),
        }));
        setRoomTypes(mapped);
      }
    } catch (error) {
      console.warn('객실 유형 목록 조회 실패:', error);
    }
  };

  useEffect(() => {
    loadRoomTypes();
  }, []);

  const filteredRoomTypes = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return roomTypes.filter((roomType) => {
      const matchesSearch =
        !keyword ||
        roomType.name.toLowerCase().includes(keyword) ||
        roomType.description.toLowerCase().includes(keyword);
      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'active' ? roomType.isActive : !roomType.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [roomTypes, searchTerm, statusFilter]);

  const handleOpenCreate = () => {
    setEditingRoomType(null);
    setFormState({
      name: '',
      count: '',
      nightlyRate: '',
      description: '',
      isActive: true
    });
    setOpenDialog(true);
  };

  const handleEdit = (roomType: RoomType) => {
    setEditingRoomType(roomType);
    setFormState({
      name: roomType.name,
      count: String(roomType.count),
      nightlyRate: String(roomType.nightlyRate),
      description: roomType.description,
      isActive: roomType.isActive
    });
    setOpenDialog(true);
  };

  const handleSave = () => {
    const saveRoomType = async () => {
      const name = formState.name.trim();
      const count = Number(formState.count);
      const nightlyRate = Number(formState.nightlyRate);

      if (!name || Number.isNaN(count) || Number.isNaN(nightlyRate)) {
        return;
      }

      if (editingRoomType) {
        const response = await roomTypeService.updateRoomType(editingRoomType.id, {
          name,
          room_count: count,
          nightly_rate: nightlyRate,
          description: formState.description.trim(),
          is_active: formState.isActive,
        });
        if (response.success) {
          await loadRoomTypes();
        }
      } else {
        const response = await roomTypeService.createRoomType({
          name,
          room_count: count,
          nightly_rate: nightlyRate,
          description: formState.description.trim(),
          is_active: formState.isActive,
        });
        if (response.success) {
          await loadRoomTypes();
        }
      }

      setOpenDialog(false);
    };

    const name = formState.name.trim();
    const count = Number(formState.count);
    const nightlyRate = Number(formState.nightlyRate);

    if (!name || Number.isNaN(count) || Number.isNaN(nightlyRate)) {
      return;
    }

    void saveRoomType();
  };

  const handleDelete = (roomTypeId: number) => {
    if (window.confirm(t('roomTypeManagement.confirmDelete'))) {
      void (async () => {
        try {
          const response = await roomTypeService.deleteRoomType(roomTypeId);
          if (response.success) {
            await loadRoomTypes();
          }
        } catch (error) {
          console.warn('객실 유형 삭제 실패:', error);
        }
      })();
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('roomTypeManagement.title')}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          {t('roomTypeManagement.actions.register')}
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' },
              gap: 2,
              alignItems: 'end'
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomTypeManagement.filters.search')}
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder={t('roomTypeManagement.placeholders.search')}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  )
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomTypeManagement.filters.status')}
              </Typography>
              <FormControl size="small" fullWidth>
                <Select
                  value={statusFilter}
                  displayEmpty
                  renderValue={(selected) => (selected ? selected : t('roomTypeManagement.filters.statusAll'))}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <MenuItem value="">{t('roomTypeManagement.filters.statusAll')}</MenuItem>
                  <MenuItem value="active">{t('roomTypeManagement.status.active')}</MenuItem>
                  <MenuItem value="inactive">{t('roomTypeManagement.status.inactive')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Button
              variant="outlined"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
              }}
            >
              {t('roomTypeManagement.actions.reset')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <TableContainer component={Box} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {[
                  t('roomTypeManagement.columns.roomType'),
                  t('roomTypeManagement.columns.roomCount'),
                  t('roomTypeManagement.columns.nightlyRate'),
                  t('roomTypeManagement.columns.description'),
                  t('roomTypeManagement.columns.status'),
                  t('roomTypeManagement.columns.actions')
                ].map((label) => (
                  <TableCell
                    key={label}
                    sx={{
                      fontWeight: 700,
                      color: '#c62828',
                      backgroundColor: '#f8f9fb',
                      borderBottom: '1px solid #e0e0e0'
                    }}
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRoomTypes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      {t('roomTypeManagement.empty.noData')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {filteredRoomTypes.map((roomType) => (
                <TableRow key={roomType.id} hover>
                  <TableCell sx={{ fontSize: 13 }}>{roomType.name}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{roomType.count}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>
                    Rs. {roomType.nightlyRate.toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{roomType.description || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={roomType.isActive ? t('roomTypeManagement.status.active') : t('roomTypeManagement.status.inactive')}
                      color={roomType.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton size="small" onClick={() => handleEdit(roomType)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(roomType.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRoomType ? t('roomTypeManagement.dialog.editTitle') : t('roomTypeManagement.dialog.registerTitle')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomTypeManagement.fields.roomTypeName')}
                <Box component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Box>
              </Typography>
              <TextField
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                required
                size="small"
                fullWidth
                placeholder={t('roomTypeManagement.placeholders.roomTypeName')}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomTypeManagement.fields.roomCount')}
                <Box component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Box>
              </Typography>
              <TextField
                value={formState.count}
                onChange={(event) => setFormState((prev) => ({ ...prev, count: event.target.value }))}
                type="number"
                inputProps={{ min: 0 }}
                required
                size="small"
                fullWidth
                placeholder={t('roomTypeManagement.placeholders.roomCount')}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomTypeManagement.fields.nightlyRate')}
                <Box component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Box>
              </Typography>
              <TextField
                value={formState.nightlyRate}
                onChange={(event) => setFormState((prev) => ({ ...prev, nightlyRate: event.target.value }))}
                type="number"
                inputProps={{ min: 0 }}
                required
                size="small"
                fullWidth
                placeholder={t('roomTypeManagement.placeholders.nightlyRate')}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomTypeManagement.fields.status')}
              </Typography>
              <FormControl size="small" fullWidth>
                <Select
                  value={formState.isActive ? 'active' : 'inactive'}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, isActive: event.target.value === 'active' }))
                  }
                >
                  <MenuItem value="active">{t('roomTypeManagement.status.active')}</MenuItem>
                  <MenuItem value="inactive">{t('roomTypeManagement.status.inactive')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomTypeManagement.fields.description')}
              </Typography>
              <TextField
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                multiline
                minRows={3}
                size="small"
                fullWidth
                placeholder={t('roomTypeManagement.placeholders.description')}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSave}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoomTypeManagement;
