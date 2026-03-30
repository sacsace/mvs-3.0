import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  Chip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { roomBookingService } from '../../services/api';

const formatDate = (value: string | undefined, locale: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(locale);
};

const FrontDesk: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [dialog, setDialog] = useState<{ open: boolean; mode: 'checkin' | 'checkout' | null }>({ open: false, mode: null });
  const [selectedBookingId, setSelectedBookingId] = useState<number | ''>('');

  const today = new Date().toISOString().split('T')[0];
  const todayCheckins = bookings.filter((b) => b.check_in_date === today).length;
  const todayCheckouts = bookings.filter((b) => b.check_out_date === today).length;
  const pendingRequests = bookings.filter((b) => b.status === 'pending').length;
  const occupancyRate = useMemo(() => {
    const checkedIn = bookings.filter((b) => b.status === 'checked_in').length;
    return bookings.length > 0 ? `${Math.round((checkedIn / bookings.length) * 100)}%` : '0%';
  }, [bookings]);

  const summaryCards = [
    { label: t('frontDesk.summary.todayCheckin'), value: String(todayCheckins) },
    { label: t('frontDesk.summary.todayCheckout'), value: String(todayCheckouts) },
    { label: t('frontDesk.summary.occupancyRate'), value: occupancyRate },
    { label: t('frontDesk.summary.pendingRequests'), value: String(pendingRequests) }
  ];

  const availableForCheckin = bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending');
  const availableForCheckout = bookings.filter((b) => b.status === 'checked_in');

  const loadBookings = async () => {
    setLoading(true);
    try {
      const response = await roomBookingService.getRoomBookings({});
      if (response.success) {
        setBookings(response.data || []);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error('예약 목록 로드 실패:', error);
      setSnackbar({ open: true, message: t('frontDesk.errors.loadBookingsFailed'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const updateStatus = async (id: number, status: 'checked_in' | 'checked_out') => {
    try {
      setLoading(true);
      const response = await roomBookingService.updateRoomBooking(id, { status });
      if (response.success) {
        setSnackbar({
          open: true,
          message: status === 'checked_in' ? t('frontDesk.messages.checkinDone') : t('frontDesk.messages.checkoutDone'),
          severity: 'success'
        });
        await loadBookings();
      } else {
        setSnackbar({ open: true, message: response.message || t('frontDesk.errors.processFailed'), severity: 'error' });
      }
    } catch (error) {
      console.error('상태 변경 실패:', error);
      setSnackbar({ open: true, message: t('frontDesk.errors.processFailed'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = () => {
    if (!dialog.mode || !selectedBookingId) return;
    updateStatus(Number(selectedBookingId), dialog.mode === 'checkin' ? 'checked_in' : 'checked_out');
    setDialog({ open: false, mode: null });
    setSelectedBookingId('');
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending': return t('frontDesk.status.pending');
      case 'confirmed': return t('frontDesk.status.confirmed');
      case 'checked_in': return t('frontDesk.status.checkedIn');
      case 'checked_out': return t('frontDesk.status.checkedOut');
      case 'cancelled': return t('frontDesk.status.cancelled');
      case 'no_show': return t('frontDesk.status.noShow');
      default: return status;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'checked_in': return 'success';
      case 'checked_out': return 'default';
      case 'confirmed': return 'info';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      case 'no_show': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('frontDesk.title')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('frontDesk.description')}
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {summaryCards.map((item) => (
          <Grid key={item.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{item.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t('frontDesk.bookingListTitle')}</Typography>
              <Divider sx={{ my: 1.5 }} />
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('frontDesk.columns.bookingNo')}</TableCell>
                      <TableCell>{t('frontDesk.columns.guestName')}</TableCell>
                      <TableCell>{t('frontDesk.columns.checkin')}</TableCell>
                      <TableCell>{t('frontDesk.columns.checkout')}</TableCell>
                      <TableCell>{t('frontDesk.columns.status')}</TableCell>
                      <TableCell align="right">{t('frontDesk.columns.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography variant="body2" color="text.secondary">
                            {t('frontDesk.empty.noData')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      bookings.map((booking) => (
                        <TableRow key={booking.id} hover>
                          <TableCell>{booking.booking_id || booking.id}</TableCell>
                          <TableCell>{booking.guest_name || booking.user?.username || '-'}</TableCell>
                          <TableCell>{formatDate(booking.check_in_date, i18n.language === 'en' ? 'en-US' : 'ko-KR')}</TableCell>
                          <TableCell>{formatDate(booking.check_out_date, i18n.language === 'en' ? 'en-US' : 'ko-KR')}</TableCell>
                          <TableCell>
                            <Chip label={statusLabel(booking.status)} size="small" color={statusColor(booking.status)} />
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={booking.status === 'checked_in' || booking.status === 'checked_out'}
                                onClick={() => updateStatus(booking.id, 'checked_in')}
                              >
                                {t('frontDesk.actions.checkin')}
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={booking.status !== 'checked_in'}
                                onClick={() => updateStatus(booking.id, 'checked_out')}
                              >
                                {t('frontDesk.actions.checkout')}
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t('frontDesk.quickActionsTitle')}</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button variant="outlined" onClick={() => setDialog({ open: true, mode: 'checkin' })}>{t('frontDesk.actions.newCheckin')}</Button>
                  <Button variant="outlined" onClick={() => setDialog({ open: true, mode: 'checkout' })}>{t('frontDesk.actions.processCheckout')}</Button>
                  <Button variant="outlined">{t('frontDesk.actions.assignRoom')}</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, mode: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.mode === 'checkin' ? t('frontDesk.dialog.checkinTitle') : t('frontDesk.dialog.checkoutTitle')}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>{t('frontDesk.dialog.selectBooking')}</InputLabel>
            <Select
              label={t('frontDesk.dialog.selectBooking')}
              value={selectedBookingId}
              onChange={(e) => setSelectedBookingId(e.target.value as number)}
            >
              {(dialog.mode === 'checkin' ? availableForCheckin : availableForCheckout).map((booking) => (
                <MenuItem key={booking.id} value={booking.id}>
                  {booking.booking_id || booking.id} - {booking.guest_name || booking.user?.username || '-'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, mode: null })}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleQuickAction} disabled={!selectedBookingId}>
            {t('frontDesk.actions.process')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FrontDesk;
