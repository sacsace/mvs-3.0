import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  TextField,
  InputBase,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Alert,
  Snackbar,
  InputAdornment,
  Divider,
  Avatar,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Autocomplete,
  TableSortLabel,
  useTheme
} from '@mui/material';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import {
  mvsPageRootSx,
  mvsBodyCardSx,
  mvsBodyOutlinedBtnSx,
  mvsBodyPrimaryBtnSx,
  mvsBodyListZoneSx,
  mvsBodyListTableSx,
  mvsBodyPaginationSx,
  mvsSearchFieldSx,
  mvsFilterFieldHeightSx,
  mvsTableScrollSx,
  mvsTableHeadHighlightSx,
  mvsTableBodyRowSx,
} from '../../theme/mvsLayout';
import { alpha } from '@mui/material/styles';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Hotel as HotelIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Print as PrintIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import {
  API_BASE_URL,
  accountingService,
  companyService,
  roomBookingService,
  roomTypeRoomService,
  roomTypeService,
  userUiPreferencesService
} from '../../services/api';
import { useReferenceDataStore } from '../../store/referenceDataStore';
import { getUploadUrl } from '../../utils/uploadUrl';
import AuthMedia from '../../components/Common/AuthMedia';
import { generateRoomBookingId } from '../../utils/bookingId';

interface Room {
  id: number;
  roomNumber: string;
  roomType: 'standard' | 'deluxe' | 'suite' | 'presidential';
  floor: number;
  capacity: number;
  amenities: string[];
  status: 'available' | 'occupied' | 'maintenance' | 'reserved' | 'cleaning';
  description: string;
  pricePerNight: number;
  imageUrl?: string;
}

interface Booking {
  id: number;
  bookingId: string;
  roomId: number;
  roomNumber: string;
  roomType: string;
  guestName: string;
  companyName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkInTime?: string;
  checkOutDate: string;
  checkOutTime?: string;
  numberOfGuests: number;
  totalNights: number;
  totalAmount: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'checked_in' | 'checked_out' | 'no_show';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'partial';
  specialRequests?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface RoomTypeMaster {
  id: number;
  name: string;
  nightlyRate?: number;
}

interface RoomTypeRoom {
  roomTypeId: number;
  roomNumber: string;
  roomName?: string;
}

interface StoredInvoiceTaxRate {
  cgstRate: number;
  sgstRate: number;
}

interface RoomBookingManagementProps {
  dialogOnly?: boolean;
  initialFormState?: Partial<{
    bookingId: string;
    roomId: string;
    roomNumber: string;
    roomType: string;
    guestName: string;
    companyName: string;
    guestEmail: string;
    guestPhone: string;
    checkInDate: string;
    checkInTime: string;
    checkOutDate: string;
    checkOutTime: string;
    numberOfGuests: number;
    nightlyRate: string;
    totalAmount: string;
    specialRequests: string;
  }>;
  onCloseDialog?: () => void;
}

const roomBookingFilterFieldSx = {
  ...(mvsSearchFieldSx as Record<string, unknown>),
  ...mvsFilterFieldHeightSx,
} as const;

const listStateBoxSx = {
  ...mvsBodyListTableSx,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  py: 6,
  px: 2,
} as const;

const bookingTableSx = {
  width: '100%',
  maxWidth: '100%',
  tableLayout: 'fixed' as const,
  borderCollapse: 'collapse',
  bgcolor: 'transparent',
  '& .MuiTableCell-root': {
    borderLeft: 'none',
    borderRight: 'none',
    borderTop: 'none',
  },
} as const;

const bookingChipCellSx = {
  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
  py: 0.75,
  px: { xs: 0.5, sm: 0.75 },
  verticalAlign: 'middle' as const,
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
} as const;

const bookingCellBaseSx = {
  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
  py: 0.75,
  px: { xs: 0.5, sm: 1 },
  verticalAlign: 'middle' as const,
} as const;

const bookingCellEllipsisSx = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 0,
} as const;

const renderEllipsisText = (text: string) => (
  <Tooltip title={text} placement="top-start" enterDelay={400}>
    <Box
      component="span"
      sx={{
        display: 'block',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </Box>
  </Tooltip>
);

const invoicePanelSx = {
  p: 2,
  height: '100%',
  borderRadius: '14px',
  border: '1px solid #C5CED9',
  bgcolor: '#FAFBFC',
  boxSizing: 'border-box',
} as const;

const invoicePanelTitleSx = {
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'text.secondary',
  mb: 1.5,
} as const;

const invoiceMetaLabelSx = {
  fontSize: '0.6875rem',
  fontWeight: 600,
  color: 'text.secondary',
  display: 'block',
  mb: 0.25,
} as const;

const invoiceTableSx = {
  width: '100%',
  tableLayout: 'fixed' as const,
  borderCollapse: 'collapse',
  bgcolor: 'transparent',
  '& .MuiTableCell-root': {
    borderLeft: 'none',
    borderRight: 'none',
    borderTop: 'none',
  },
} as const;

const invoiceCellSx = {
  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
  py: 1,
  px: { xs: 1, sm: 1.5 },
  verticalAlign: 'middle' as const,
} as const;

const invoiceTaxSelectSx = {
  minWidth: 68,
  height: 28,
  fontSize: '0.75rem',
  '& .MuiSelect-select': { py: 0.25, px: 1 },
  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
  '&:hover .MuiOutlinedInput-notchedOutline': { border: 'none' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' },
} as const;

const RoomBookingManagement: React.FC<RoomBookingManagementProps> = ({
  dialogOnly = false,
  initialFormState,
  onCloseDialog
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user } = useStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<string>('guestName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [shouldAutoPrint, setShouldAutoPrint] = useState(false);
  const [settling, setSettling] = useState(false);
  const [cgstRate, setCgstRate] = useState(2.5);
  const [sgstRate, setSgstRate] = useState(2.5);
  const [invoiceTaxSnapshot, setInvoiceTaxSnapshot] = useState<Record<string, StoredInvoiceTaxRate>>({});
  const handleCgstChange = (value: number) => {
    setCgstRate(value);
    setSgstRate(value);
    if (selectedBooking) {
      persistInvoiceTaxRate(selectedBooking.id, {
        cgstRate: value,
        sgstRate: value
      });
    }
  };
  const handleSgstChange = (value: number) => {
    setCgstRate(value);
    setSgstRate(value);
    if (selectedBooking) {
      persistInvoiceTaxRate(selectedBooking.id, {
        cgstRate: value,
        sgstRate: value
      });
    }
  };
  const getAutoGstRate = (nightlyRate?: number) => {
    if (!nightlyRate || !Number.isFinite(nightlyRate)) return 2.5;
    if (nightlyRate <= 2500) return 2.5;
    if (nightlyRate <= 7500) return 6;
    return 9;
  };
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [invoiceDescription, setInvoiceDescription] = useState('');
  const [invoiceUnitPrice, setInvoiceUnitPrice] = useState('');
  const [billTo, setBillTo] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    gst: ''
  });
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [issuerCompany, setIssuerCompany] = useState<{
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    businessNumber?: string;
    companyLogo?: string;
    gstNumbers?: string[];
    authorizedSignature?: string;
  } | null>(null);
  const invoiceRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const apiBaseUrl = useMemo(() => API_BASE_URL.replace(/\/api$/, ''), []);

  const billToInputSx = {
    fontSize: '0.8125rem',
    '& .MuiInputBase-root': {
      fontSize: 'inherit',
      backgroundColor: 'transparent',
      boxShadow: 'none',
      border: 'none',
    },
    '& .MuiInputBase-input': {
      padding: '2px 0 4px',
      border: 'none',
      outline: 'none',
      boxShadow: 'none',
      borderBottom: '1px dashed',
      borderColor: 'divider',
    },
    '& input': {
      border: 'none',
      outline: 'none',
      boxShadow: 'none',
    },
    '& .MuiInput-underline:before': {
      borderBottom: 'none',
    },
    '& .MuiInput-underline:after': {
      borderBottom: 'none',
    },
    '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
      borderBottom: 'none',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      border: 'none !important',
    },
  };
  const invoiceInputSx = {
    fontSize: '0.8125rem',
    '& .MuiInputBase-root': {
      fontSize: 'inherit',
      backgroundColor: 'transparent',
      boxShadow: 'none',
      border: 'none',
    },
    '& .MuiInputBase-input': {
      padding: '2px 0',
      border: 'none',
      outline: 'none',
      boxShadow: 'none',
    },
    '& input': {
      border: 'none',
      outline: 'none',
      boxShadow: 'none',
    },
    '& .MuiInput-underline:before': {
      borderBottom: 'none',
    },
    '& .MuiInput-underline:after': {
      borderBottom: 'none',
    },
    '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
      borderBottom: 'none',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      border: 'none !important',
    },
  };
  const [roomTypeMaster, setRoomTypeMaster] = useState<RoomTypeMaster[]>([]);
  const [roomTypeRooms, setRoomTypeRooms] = useState<RoomTypeRoom[]>([]);
  const [formState, setFormState] = useState({
    bookingId: '',
    roomId: '',
    roomNumber: '',
    roomType: '',
    guestName: '',
    companyName: '',
    guestEmail: '',
    guestPhone: '',
    checkInDate: '',
    checkInTime: '15:00',
    checkOutDate: '',
    checkOutTime: '17:00',
    numberOfGuests: 1,
    nightlyRate: '',
    totalAmount: '',
    specialRequests: ''
  });

  useEffect(() => {
    if (!user?.id) {
      setInvoiceTaxSnapshot({});
      return;
    }
    userUiPreferencesService
      .get()
      .then((p) => {
        const raw = p.roomInvoiceTaxSnapshot;
        if (raw && typeof raw === 'object') {
          setInvoiceTaxSnapshot(raw as Record<string, StoredInvoiceTaxRate>);
        }
      })
      .catch(() => {});
  }, [user?.id]);

  const readStoredInvoiceTaxRates = (): Record<string, StoredInvoiceTaxRate> => invoiceTaxSnapshot;

  const persistInvoiceTaxRate = (bookingId: number, next: StoredInvoiceTaxRate) => {
    setInvoiceTaxSnapshot((prev) => {
      const snapshot = { ...prev, [String(bookingId)]: next };
      userUiPreferencesService.patch({ roomInvoiceTaxSnapshot: snapshot }).catch(() => {});
      return snapshot;
    });
  };

  useEffect(() => {
    if (!dialogOnly) return;
    setSelectedBooking(null);
    setOpenDialog(true);
  }, [dialogOnly]);

  useEffect(() => {
    if (!dialogOnly || !initialFormState) return;
    setSelectedBooking(null);
    setFormState((prev) => ({
      ...prev,
      bookingId: initialFormState.bookingId || prev.bookingId || generateRoomBookingId(),
      checkInTime: initialFormState.checkInTime || prev.checkInTime || '15:00',
      checkOutTime: initialFormState.checkOutTime || prev.checkOutTime || '17:00',
      ...initialFormState
    }));
  }, [dialogOnly, initialFormState]);

  useEffect(() => {
    if (!selectedBooking) return;
    setInvoiceDescription('Accommodation charge');
    setBillTo({
      name: selectedBooking.guestName || '',
      company: selectedBooking.companyName || '',
      email: selectedBooking.guestEmail || '',
      phone: selectedBooking.guestPhone || '',
      gst: ''
    });
    const nightly =
      selectedBooking.totalNights && selectedBooking.totalNights > 0
        ? selectedBooking.totalAmount / selectedBooking.totalNights
        : selectedBooking.totalAmount;
    setInvoiceUnitPrice(
      Number.isFinite(Number(nightly)) ? String(Number(nightly.toFixed(2))) : ''
    );
    const autoRate = getAutoGstRate(nightly);
    const storedRate = readStoredInvoiceTaxRates()[String(selectedBooking.id)];
    if (storedRate && Number.isFinite(storedRate.cgstRate) && Number.isFinite(storedRate.sgstRate)) {
      setCgstRate(Number(storedRate.cgstRate));
      setSgstRate(Number(storedRate.sgstRate));
      return;
    }
    setCgstRate(autoRate);
    setSgstRate(autoRate);
  }, [selectedBooking, invoiceTaxSnapshot]);

  useEffect(() => {
    const loadIssuerCompany = async () => {
      if (!user?.company_id) {
        setIssuerCompany(null);
        return;
      }
      try {
        const data = await useReferenceDataStore.getState().fetchCompanyById(Number(user.company_id));
        if (data) {
          const issuerGstList = Array.isArray(data.gst_numbers)
            ? data.gst_numbers
            : Array.isArray(data.gstNumbers)
            ? data.gstNumbers
            : data.gst_number
            ? [data.gst_number]
            : data.gstin
            ? [data.gstin]
            : data.gstNo
            ? [data.gstNo]
            : data.gst
            ? [data.gst]
            : [];
          setIssuerCompany({
            name: data.name || data.company_name || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            businessNumber: data.business_number || data.businessNumber || '',
            companyLogo: data.company_logo || '',
            gstNumbers: issuerGstList.filter((gst: string) => gst && String(gst).trim() !== ''),
            authorizedSignature: data.ceo_signature || data.company_seal || ''
          });
        } else {
          setIssuerCompany(null);
        }
      } catch (error) {
        console.error('회사 정보 로드 오류:', error);
        setIssuerCompany(null);
      }
    };

    loadIssuerCompany();
  }, [user?.company_id]);

  const openBookingEditForm = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    const nightlyRate =
      booking.totalNights && booking.totalAmount
        ? Math.round(booking.totalAmount / booking.totalNights)
        : '';
    setFormState({
      bookingId: booking.bookingId,
      roomId: String(booking.roomId),
      roomNumber: booking.roomNumber,
      roomType: booking.roomType,
      guestName: booking.guestName,
      companyName: booking.companyName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone,
      checkInDate: booking.checkInDate,
      checkInTime: booking.checkInTime || '',
      checkOutDate: booking.checkOutDate,
      checkOutTime: booking.checkOutTime || '',
      numberOfGuests: booking.numberOfGuests,
      nightlyRate: nightlyRate ? String(nightlyRate) : '',
      totalAmount: String(booking.totalAmount),
      specialRequests: booking.specialRequests || ''
    });
    setOpenDialog(true);
  }, []);

  useEffect(() => {
    const state = location.state as {
      viewBookingId?: number;
      editBookingId?: number;
      autoPrint?: boolean;
    } | null;
    const targetId = state?.editBookingId || state?.viewBookingId;
    if (!targetId) return;
    const found = bookings.find((booking) => booking.id === targetId);
    if (found) {
      if (state?.editBookingId) {
        openBookingEditForm(found);
      } else {
        setSelectedBooking(found);
        setViewMode('view');
        if (state?.autoPrint) {
          setShouldAutoPrint(true);
        }
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [bookings, location.pathname, location.state, navigate, openBookingEditForm]);

  useEffect(() => {
    const loadRoomTypes = async () => {
      try {
        const response = await roomTypeService.getRoomTypes({ status: 'active' });
        if (response.success) {
          const mapped = (response.data || [])
            .map((item: any) => {
              const rawRate = item?.nightly_rate ?? item?.nightlyRate;
              const parsedRate =
                rawRate === null || rawRate === undefined || rawRate === ''
                  ? undefined
                  : Number(rawRate);
              return {
                id: Number(item?.id),
                name: String(item?.name || '').trim(),
                nightlyRate: Number.isNaN(parsedRate) ? undefined : parsedRate
              };
            })
            .filter((item: { id: number; name: string }) => Number.isFinite(item.id) && !!item.name);
          const unique = new Map<string, RoomTypeMaster>();
          mapped.forEach((item: RoomTypeMaster) => {
            if (!unique.has(item.name)) {
              unique.set(item.name, item);
            }
          });
          setRoomTypeMaster(Array.from(unique.values()));
        }
      } catch (error) {
        console.warn('객실 유형 목록 조회 실패:', error);
      }
    };

    loadRoomTypes();
  }, []);

  useEffect(() => {
    if (!formState.roomType || formState.nightlyRate) return;
    const matched = roomTypeMaster.find((item) => item.name === formState.roomType);
    if (!matched || typeof matched.nightlyRate !== 'number' || !Number.isFinite(matched.nightlyRate)) {
      return;
    }
    const nextNightlyRate = String(matched.nightlyRate);
    setFormState((prev) => ({
      ...prev,
      nightlyRate: nextNightlyRate,
      totalAmount: prev.checkInDate && prev.checkOutDate
        ? String(Math.round(Number(nextNightlyRate) * calculateTotalNights(prev.checkInDate, prev.checkOutDate)))
        : prev.totalAmount
    }));
  }, [formState.roomType, formState.nightlyRate, roomTypeMaster]);

  useEffect(() => {
    const loadRoomTypeRooms = async () => {
      try {
        const response = await roomTypeRoomService.getRoomTypeRooms();
        if (response.success) {
          const mapped = (response.data || [])
            .map((item: any) => ({
              roomTypeId: Number(item?.room_type_id),
              roomNumber: String(item?.room_number || '').trim(),
              roomName: item?.room_name ? String(item.room_name).trim() : ''
            }))
            .filter((item: RoomTypeRoom) => Number.isFinite(item.roomTypeId) && !!item.roomNumber);
          setRoomTypeRooms(mapped);
        }
      } catch (error) {
        console.warn('객실 번호 목록 조회 실패:', error);
      }
    };

    loadRoomTypeRooms();
  }, []);

  const roomTypeOptions = useMemo(() => {
    const types = new Set<string>();
    roomTypeMaster.forEach((item) => types.add(item.name));
    return Array.from(types).filter(Boolean).sort();
  }, [roomTypeMaster]);

  const availableRoomOptions = useMemo(() => {
    const selectedType = formState.roomType.trim();
    if (!selectedType) return [];
    const typeInfo = roomTypeMaster.find((item) => item.name === selectedType);
    const typeId = typeInfo?.id;
    if (!typeId) return [];
    const roomsForType = roomTypeRooms.filter((room) => room.roomTypeId === typeId);

    if (!formState.checkInDate || !formState.checkOutDate) {
      return [];
    }

    const start = new Date(`${formState.checkInDate}T00:00:00`);
    const end = new Date(`${formState.checkOutDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return [];
    }

    const blocked = new Set<string>();
    bookings.forEach((booking) => {
      if (selectedBooking && booking.id === selectedBooking.id) {
        return;
      }
      if (booking.status === 'cancelled' || booking.status === 'no_show') {
        return;
      }
      if (booking.roomType !== selectedType) {
        return;
      }
      if (!booking.checkInDate || !booking.checkOutDate) {
        return;
      }
      const bookingStart = new Date(`${booking.checkInDate}T00:00:00`);
      const bookingEnd = new Date(`${booking.checkOutDate}T00:00:00`);
      if (Number.isNaN(bookingStart.getTime()) || Number.isNaN(bookingEnd.getTime())) {
        return;
      }
      const overlaps = start < bookingEnd && end > bookingStart;
      if (overlaps) {
        blocked.add(booking.roomNumber);
      }
    });

    const available = roomsForType.filter((room) => !blocked.has(room.roomNumber));
    if (selectedBooking && selectedBooking.roomType === selectedType && selectedBooking.roomNumber) {
      const exists = available.some((room) => room.roomNumber === selectedBooking.roomNumber);
      if (!exists) {
        const matchedRoom = roomsForType.find((room) => room.roomNumber === selectedBooking.roomNumber);
        available.push({
          roomTypeId: typeId,
          roomNumber: selectedBooking.roomNumber,
          roomName: matchedRoom?.roomName || ''
        });
      }
    }
    return [...available].sort((a, b) =>
      String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true })
    );
  }, [
    bookings,
    formState.checkInDate,
    formState.checkOutDate,
    formState.roomType,
    roomTypeMaster,
    roomTypeRooms,
    selectedBooking
  ]);
  const canSearchRooms = Boolean(formState.roomType && formState.checkInDate && formState.checkOutDate);

  const calculateTotalNights = (checkInDate: string, checkOutDate: string) => {
    if (!checkInDate || !checkOutDate) return 1;
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
    const diffDays = Math.max(Math.ceil((end.getTime() - start.getTime()) / 86400000), 1);
    return diffDays;
  };

  const toIsoDate = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const buildCompanyAbbreviation = (name?: string) => {
    const cleaned = (name || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!cleaned) return 'CMP';
    return cleaned.slice(0, 3).padEnd(3, 'X');
  };

  const getFiscalYearSuffix = (value?: string): string => {
    const date = value ? new Date(value) : new Date();
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    const year = safeDate.getFullYear();
    const month = safeDate.getMonth();
    if (month >= 3) {
      return `${String(year % 100).padStart(2, '0')}-${String((year + 1) % 100).padStart(2, '0')}`;
    }
    return `${String((year - 1) % 100).padStart(2, '0')}-${String(year % 100).padStart(2, '0')}`;
  };

  const formatInvoiceNumber = (sequence?: number) => {
    const companyPrefix = buildCompanyAbbreviation(issuerCompany?.name);
    const fy = getFiscalYearSuffix(selectedBooking?.checkInDate);
    const seq = String(sequence || 0).padStart(4, '0');
    return `${companyPrefix}/${fy}/INV/${seq}`;
  };

  const resolveLogoUrl = (logo?: string) => getUploadUrl(logo);

  const formatCurrency = (value?: string | number) => {
    if (value === null || value === undefined) return '';
    const raw = String(value).replace(/,/g, '');
    const numeric = Number.parseFloat(raw);
    if (Number.isNaN(numeric)) return '';
    return numeric.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const todayIso = toIsoDate(new Date());
  const canManagePastCheckIn = user?.role === 'root' || user?.role === 'admin';

  const guestOptions = useMemo(() => {
    const map = new Map<string, { name: string; email: string; phone: string; companyName: string }>();
    bookings.forEach((booking) => {
      const name = booking.guestName?.trim();
      if (!name) return;
      if (!map.has(name)) {
        map.set(name, {
          name,
          email: booking.guestEmail || '',
          phone: booking.guestPhone || '',
          companyName: booking.companyName || ''
        });
      }
    });
    return Array.from(map.values());
  }, [bookings]);
  const parseCurrencyInput = (value: string) => value.replace(/[^\d]/g, '');

  const updateTotalFromNightly = (nextNightlyRate: string, nextCheckIn?: string, nextCheckOut?: string) => {
    const normalized = parseCurrencyInput(nextNightlyRate);
    const nightly = Number(normalized);
    if (!normalized || Number.isNaN(nightly)) {
      setFormState((prev) => ({
        ...prev,
        nightlyRate: '',
        totalAmount: ''
      }));
      return;
    }
    const nights = calculateTotalNights(nextCheckIn ?? formState.checkInDate, nextCheckOut ?? formState.checkOutDate);
    setFormState((prev) => ({
      ...prev,
      nightlyRate: String(nightly),
      totalAmount: String(Math.round(nightly * nights))
    }));
  };

  const loadBookings = useCallback(async () => {
    setError('');
    setRooms([]);
    try {
      const response = await roomBookingService.getRoomBookings();
      if (response.success) {
        const bookingsData: Booking[] = (response.data || []).map((b: any) => ({
          id: b.id,
          bookingId: b.booking_id || '',
          roomId: b.room_id,
          roomNumber: b.room_number || '',
          roomType: b.room_type || '',
          guestName: b.guest_name || '',
          companyName: b.company_name || '',
          guestEmail: b.guest_email || '',
          guestPhone: b.guest_phone || '',
          checkInDate: b.check_in_date || '',
          checkInTime: b.check_in_time || '',
          checkOutDate: b.check_out_date || '',
          checkOutTime: b.check_out_time || '',
          numberOfGuests: b.number_of_guests || 1,
          totalNights: b.total_nights || 1,
          totalAmount: parseFloat(b.total_amount || 0),
          status: b.status || 'pending',
          paymentStatus: b.payment_status || 'pending',
          paymentMethod: b.payment_method || '',
          specialRequests: b.special_requests || '',
          createdAt: b.created_at || new Date().toISOString(),
          updatedAt: b.updated_at || new Date().toISOString(),
          createdBy: b.creator?.username || t('roomBookingManagement.unknown')
        }));
        setBookings(bookingsData);
      } else {
        setError(response.message || t('roomBookingManagement.errors.loadListFailed'));
        setBookings([]);
      }
    } catch (error: any) {
      console.error('예약 목록 조회 오류:', error);
      setError(error.response?.data?.message || t('roomBookingManagement.errors.loadListFailed'));
      setBookings([]);
    }
  }, [t]);

  const filterBookings = useCallback(() => {
    let filtered = bookings;

    if (searchTerm) {
      const keyword = searchTerm.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.guestName.toLowerCase().includes(keyword) ||
        booking.bookingId.toLowerCase().includes(keyword) ||
        booking.guestEmail.toLowerCase().includes(keyword) ||
        booking.roomNumber.toLowerCase().includes(keyword) ||
        booking.companyName.toLowerCase().includes(keyword)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    if (roomTypeFilter) {
      filtered = filtered.filter(booking => booking.roomType === roomTypeFilter);
    }

    if (paymentFilter) {
      filtered = filtered.filter(booking =>
        paymentFilter === 'paid' ? booking.paymentStatus === 'paid' : booking.paymentStatus !== 'paid'
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(booking => 
        booking.checkInDate === dateFilter || 
        booking.checkOutDate === dateFilter ||
        (booking.checkInDate <= dateFilter && booking.checkOutDate >= dateFilter)
      );
    }

    setFilteredBookings(filtered);
  }, [bookings, searchTerm, statusFilter, roomTypeFilter, paymentFilter, dateFilter]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    filterBookings();
  }, [filterBookings]);

  const chipSx = {
    fontWeight: 500,
    borderRadius: '8px',
    height: 24,
    maxWidth: '100%',
    '& .MuiChip-label': {
      px: 0.75,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
  } as const;

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Chip label={t('roomBookingManagement.status.confirmed')} color="success" size="small" variant="outlined" sx={chipSx} />;
      case 'pending':
        return <Chip label={t('roomBookingManagement.status.pending')} color="warning" size="small" variant="outlined" sx={chipSx} />;
      case 'cancelled':
        return <Chip label={t('roomBookingManagement.status.cancelled')} color="error" size="small" variant="outlined" sx={chipSx} />;
      case 'checked_in':
        return <Chip label={t('roomBookingManagement.status.checkedIn')} color="info" size="small" variant="outlined" sx={chipSx} />;
      case 'checked_out':
        return <Chip label={t('roomBookingManagement.status.checkedOut')} color="default" size="small" variant="outlined" sx={chipSx} />;
      case 'no_show':
        return <Chip label={t('roomBookingManagement.status.noShow')} color="error" size="small" variant="outlined" sx={chipSx} />;
      default:
        return <Chip label={t('roomBookingManagement.unknown')} color="default" size="small" variant="outlined" sx={chipSx} />;
    }
  };

  const getRoomStatusChip = (status: string) => {
    switch (status) {
      case 'available':
        return <Chip label={t('roomBookingManagement.roomStatus.available')} color="success" size="small" />;
      case 'occupied':
        return <Chip label={t('roomBookingManagement.roomStatus.occupied')} color="error" size="small" />;
      case 'maintenance':
        return <Chip label={t('roomBookingManagement.roomStatus.maintenance')} color="warning" size="small" />;
      case 'reserved':
        return <Chip label={t('roomBookingManagement.roomStatus.reserved')} color="info" size="small" />;
      case 'cleaning':
        return <Chip label={t('roomBookingManagement.roomStatus.cleaning')} color="default" size="small" />;
      default:
        return <Chip label={t('roomBookingManagement.unknown')} color="default" size="small" />;
    }
  };

  const getRoomTypeLabel = (type: string) => {
    switch (type) {
      case 'standard':
        return t('roomBookingManagement.roomTypes.standard');
      case 'deluxe':
        return t('roomBookingManagement.roomTypes.deluxe');
      case 'suite':
        return t('roomBookingManagement.roomTypes.suite');
      case 'presidential':
        return t('roomBookingManagement.roomTypes.presidential');
      default:
        return type || t('roomBookingManagement.unknown');
    }
  };

  const getPaymentStatusChip = (status: string) => {
    switch (status) {
      case 'paid':
        return <Chip label={t('roomBookingManagement.payment.paid')} color="success" size="small" variant="outlined" sx={chipSx} />;
      case 'pending':
        return <Chip label={t('roomBookingManagement.payment.pending')} color="warning" size="small" variant="outlined" sx={chipSx} />;
      case 'refunded':
        return <Chip label={t('roomBookingManagement.payment.refunded')} color="info" size="small" variant="outlined" sx={chipSx} />;
      case 'partial':
        return <Chip label={t('roomBookingManagement.payment.partial')} color="default" size="small" variant="outlined" sx={chipSx} />;
      default:
        return <Chip label={t('roomBookingManagement.unknown')} color="default" size="small" variant="outlined" sx={chipSx} />;
    }
  };

  const handleViewBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setActionDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setSelectedBooking(null);
    setFormState({
      bookingId: generateRoomBookingId(),
      roomId: '',
      roomNumber: '',
      roomType: '',
      guestName: '',
      companyName: '',
      guestEmail: '',
      guestPhone: '',
      checkInDate: '',
      checkInTime: '15:00',
      checkOutDate: '',
      checkOutTime: '17:00',
      numberOfGuests: 1,
      nightlyRate: '',
      totalAmount: '',
      specialRequests: ''
    });
    setOpenDialog(true);
  };

  const handleSaveBooking = async () => {
    const trimmedRoomType = formState.roomType.trim();
    if (!trimmedRoomType) {
      setError(t('roomBookingManagement.errors.selectRoomType'));
      return;
    }

    if (!roomTypeOptions.includes(trimmedRoomType)) {
      setError(t('roomBookingManagement.errors.onlyRegisteredRoomType'));
      return;
    }

    if (!selectedBooking) {
      if (!formState.roomNumber.trim()) {
        setError(t('roomBookingManagement.errors.enterRoomNumber'));
        return;
      }
    }

    const resolvedRoomId = formState.roomId.trim()
      ? Number(formState.roomId)
      : parseInt(formState.roomNumber.trim(), 10);

    if (!resolvedRoomId || Number.isNaN(resolvedRoomId)) {
      setError(t('roomBookingManagement.errors.invalidRoomId'));
      return;
    }

    const normalizedNightly = parseCurrencyInput(formState.nightlyRate);
    const computedTotalAmount = normalizedNightly
      ? Number(normalizedNightly) * calculateTotalNights(formState.checkInDate, formState.checkOutDate)
      : formState.totalAmount
        ? Number(parseCurrencyInput(formState.totalAmount))
        : 0;

    if (!formState.guestName.trim() || !formState.checkInDate || !formState.checkOutDate || !computedTotalAmount) {
      setError(t('roomBookingManagement.errors.enterRequired'));
      return;
    }
    if (!canManagePastCheckIn && formState.checkInDate < todayIso) {
      setError(t('roomBookingManagement.errors.pastDateNotAllowed'));
      return;
    }
    if (formState.checkOutDate <= formState.checkInDate) {
      setError(t('roomBookingManagement.errors.checkoutAfterCheckin'));
      return;
    }

    try {
      setSaving(true);
      if (selectedBooking) {
        const response = await roomBookingService.updateRoomBooking(selectedBooking.id, {
          guest_name: formState.guestName.trim(),
          company_name: formState.companyName.trim() || null,
          guest_email: formState.guestEmail.trim() || null,
          guest_phone: formState.guestPhone.trim() || null,
          check_in_date: formState.checkInDate,
          check_in_time: formState.checkInTime || null,
          check_out_date: formState.checkOutDate,
          check_out_time: formState.checkOutTime || null,
          number_of_guests: Number(formState.numberOfGuests) || 1,
          total_amount: computedTotalAmount,
          special_requests: formState.specialRequests.trim() || null
        });
        if (response.success) {
          setSuccess(t('roomBookingManagement.success.updated'));
          setOpenDialog(false);
          if (dialogOnly && onCloseDialog) {
            onCloseDialog();
          }
          loadBookings();
        } else {
          setError(response.message || t('roomBookingManagement.errors.updateFailed'));
        }
      } else {
        const bookingId = formState.bookingId.trim() || generateRoomBookingId();
        const response = await roomBookingService.createRoomBooking({
          booking_id: bookingId,
          room_id: resolvedRoomId,
          room_number: formState.roomNumber.trim(),
          room_type: trimmedRoomType,
          guest_name: formState.guestName.trim(),
          company_name: formState.companyName.trim() || null,
          guest_email: formState.guestEmail.trim() || null,
          guest_phone: formState.guestPhone.trim() || null,
          check_in_date: formState.checkInDate,
          check_in_time: formState.checkInTime || null,
          check_out_date: formState.checkOutDate,
          check_out_time: formState.checkOutTime || null,
          number_of_guests: Number(formState.numberOfGuests) || 1,
          total_amount: computedTotalAmount,
          special_requests: formState.specialRequests.trim() || null
        });
        if (response.success) {
          setSuccess(t('roomBookingManagement.success.created'));
          setOpenDialog(false);
          if (dialogOnly && onCloseDialog) {
            onCloseDialog();
          }
          loadBookings();
        } else {
          setError(response.message || t('roomBookingManagement.errors.createFailed'));
        }
      }
    } catch (error: any) {
      console.error('예약 저장 오류:', error);
      setError(error.response?.data?.message || t('roomBookingManagement.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBooking = async (id: number) => {
    try {
      const response = await roomBookingService.deleteRoomBooking(id);
      if (response.success) {
        setSuccess(t('roomBookingManagement.success.deleted'));
        loadBookings();
      } else {
        setError(response.message || t('roomBookingManagement.errors.deleteFailed'));
      }
    } catch (error: any) {
      console.error('삭제 오류:', error);
      setError(error.response?.data?.message || t('roomBookingManagement.errors.deleteError'));
    }
  };

  const openDeleteDialog = (id: number) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
  };

  const confirmDeleteBooking = async () => {
    if (!deleteTargetId) return;
    await handleDeleteBooking(deleteTargetId);
    closeDeleteDialog();
  };

  const handleCheckIn = async (id: number) => {
    try {
      const response = await roomBookingService.updateRoomBooking(id, { status: 'checked_in' });
      if (response.success) {
        setSuccess(t('roomBookingManagement.success.checkedIn'));
        loadBookings();
      } else {
        setError(response.message || t('roomBookingManagement.errors.checkinFailed'));
      }
    } catch (error: any) {
      console.error('체크인 오류:', error);
      setError(error.response?.data?.message || t('roomBookingManagement.errors.checkinError'));
    }
  };

  const handleCheckOut = async (id: number) => {
    try {
      const response = await roomBookingService.updateRoomBooking(id, { status: 'checked_out' });
      if (response.success) {
        setSuccess(t('roomBookingManagement.success.checkedOut'));
        loadBookings();
      } else {
        setError(response.message || t('roomBookingManagement.errors.checkoutFailed'));
      }
    } catch (error: any) {
      console.error('체크아웃 오류:', error);
      setError(error.response?.data?.message || t('roomBookingManagement.errors.checkoutError'));
    }
  };

  const handleSettleBooking = async () => {
    if (!selectedBooking) return;
    if (selectedBooking.paymentStatus === 'paid') {
      setError(t('roomBookingManagement.errors.alreadySettled'));
      return;
    }

    const nights = Number(selectedBooking.totalNights || 1) || 1;
    const unitPrice = Number(parseCurrencyInput(invoiceUnitPrice));
    if (!invoiceUnitPrice.trim() || !Number.isFinite(unitPrice) || unitPrice < 0) {
      setError(t('roomBookingManagement.errors.invalidNightlyRate'));
      return;
    }
    const subtotal = Number((unitPrice * nights).toFixed(2));
    const combinedTaxRate = Number(cgstRate) + Number(sgstRate);
    const taxAmount = Number((subtotal * (combinedTaxRate / 100)).toFixed(2));
    const finalTotal = Number((subtotal + taxAmount).toFixed(2));
    const invoiceDate = selectedBooking.checkOutDate || selectedBooking.checkInDate || new Date().toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const description = (invoiceDescription || 'Accommodation charge').trim();

    const invoicePayload = {
      customer_name: selectedBooking.guestName || billTo.name || t('roomBookingManagement.unknown'),
      customer_email: selectedBooking.guestEmail || billTo.email || null,
      customer_phone: selectedBooking.guestPhone || billTo.phone || null,
      customer_address: null,
      customer_business_number: (billTo.gst || '').trim() || null,
      invoice_date: invoiceDate,
      due_date: invoiceDate,
      subtotal,
      tax_amount: taxAmount,
      total_amount: finalTotal,
      status: 'paid',
      payment_status: 'paid',
      payment_method: 'cash',
      payment_date: today,
      notes: `Room booking settlement: ${selectedBooking.bookingId || selectedBooking.id}`,
      items: [
        {
          item_name: description,
          description,
          quantity: nights,
          unit_price: Number(unitPrice.toFixed(2)),
          total_price: subtotal,
          tax_rate: combinedTaxRate,
          tax_amount: taxAmount
        }
      ]
    };

    try {
      setSettling(true);
      const invoiceResponse = await accountingService.createInvoice(invoicePayload);
      if (!invoiceResponse?.success) {
        setError(invoiceResponse?.message || t('roomBookingManagement.errors.settlementFailed'));
        return;
      }

      const bookingResponse = await roomBookingService.updateRoomBooking(selectedBooking.id, {
        payment_status: 'paid',
        total_amount: subtotal
      });
      if (!bookingResponse?.success) {
        setError(bookingResponse?.message || t('roomBookingManagement.errors.settlementFailed'));
        return;
      }

      const createdInvoiceNo = invoiceResponse?.data?.invoice_number;
      setSelectedBooking((prev) => (
        prev ? { ...prev, paymentStatus: 'paid' } : prev
      ));
      setSuccess(
        createdInvoiceNo
          ? `${t('roomBookingManagement.success.settled')} (${createdInvoiceNo})`
          : t('roomBookingManagement.success.settled')
      );
      loadBookings();
    } catch (error: any) {
      console.error('정산 완료 처리 오류:', error);
      setError(error.response?.data?.message || t('roomBookingManagement.errors.settlementError'));
    } finally {
      setSettling(false);
    }
  };

  const handleCancelBooking = async (id: number) => {
    try {
      const response = await roomBookingService.cancelRoomBooking(id);
      if (response.success) {
        setSuccess(t('roomBookingManagement.success.cancelled'));
        loadBookings();
      } else {
        setError(response.message || t('roomBookingManagement.errors.cancelFailed'));
      }
    } catch (error: any) {
      console.error('예약 취소 오류:', error);
      setError(error.response?.data?.message || t('roomBookingManagement.errors.cancelError'));
    }
  };

  const openCancelDialog = (id: number) => {
    setCancelTargetId(id);
    setCancelDialogOpen(true);
  };

  const closeCancelDialog = () => {
    setCancelDialogOpen(false);
    setCancelTargetId(null);
  };

  const confirmCancelBooking = async () => {
    if (!cancelTargetId) return;
    await handleCancelBooking(cancelTargetId);
    closeCancelDialog();
  };

  const todayCheckIns = bookings.filter(booking => booking.checkInDate === new Date().toISOString().split('T')[0]);
  const occupiedRooms = rooms.filter(room => room.status === 'occupied').length;
  const availableRooms = rooms.filter(room => room.status === 'available').length;
  const totalRevenue = bookings
    .filter(booking => booking.status === 'checked_out' && booking.paymentStatus === 'paid')
    .reduce((sum, booking) => sum + booking.totalAmount, 0);

  const getSortValue = (booking: Booking, key: string) => {
    switch (key) {
      case 'bookingId':
        return booking.bookingId || '';
      case 'guestName':
        return booking.guestName || '';
      case 'companyName':
        return booking.companyName || '';
      case 'guestEmail':
        return booking.guestEmail || '';
      case 'roomNumber':
        return booking.roomNumber || '';
      case 'roomType':
        return booking.roomType || '';
      case 'checkInDate':
        return booking.checkInDate || '';
      case 'checkOutDate':
        return booking.checkOutDate || '';
      case 'totalNights':
        return booking.totalNights || 0;
      case 'nightlyRate':
        return booking.totalNights
          ? Math.round(booking.totalAmount / booking.totalNights)
          : 0;
      case 'totalAmount':
        return booking.totalAmount || 0;
      case 'paymentStatus':
        return booking.paymentStatus || '';
      case 'status':
        return booking.status || '';
      case 'specialRequests':
        return booking.specialRequests || '';
      default:
        return '';
    }
  };

  const sortedBookings = useMemo(() => {
    if (!sortKey) return filteredBookings;
    const stabilized = filteredBookings.map((item, index) => ({ item, index }));
    stabilized.sort((a, b) => {
      const aValue = getSortValue(a.item, sortKey);
      const bValue = getSortValue(b.item, sortKey);
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return a.index - b.index;
    });
    return stabilized.map((row) => row.item);
  }, [filteredBookings, sortDirection, sortKey]);

  const sortedPaginatedBookings = sortedBookings.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const getRoomDisplayLabel = (booking: Booking) => {
    const typeInfo = roomTypeMaster.find((item) => item.name === booking.roomType);
    const typeId = typeInfo?.id;
    if (!typeId) {
      return booking.roomNumber;
    }
    const matched = roomTypeRooms.find(
      (room) => room.roomTypeId === typeId && room.roomNumber === booking.roomNumber
    );
    return matched?.roomName || booking.roomNumber;
  };

  const handleSort = (key?: string) => {
    if (!key) return;
    setPage(1);
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        return prevKey;
      }
      setSortDirection('asc');
      return key;
    });
  };

  const bookingDialog = (
    <Dialog
      open={openDialog}
      onClose={() => {
        setOpenDialog(false);
        if (dialogOnly && onCloseDialog) {
          onCloseDialog();
        }
      }}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {selectedBooking ? t('roomBookingManagement.dialog.editBooking') : t('roomBookingManagement.dialog.bookRoom')}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomBookingManagement.fields.bookingNo')}
                {!selectedBooking && <Box component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Box>}
              </Typography>
              <TextField
                value={formState.bookingId}
                fullWidth
                disabled
                size="small"
                placeholder={t('roomBookingManagement.placeholders.bookingNo')}
                helperText={t('roomBookingManagement.help.bookingNoAuto')}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomBookingManagement.fields.roomType')}
                <Box component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Box>
              </Typography>
              <Autocomplete
                options={roomTypeOptions}
                value={roomTypeOptions.includes(formState.roomType) ? formState.roomType : null}
                onChange={(_, value) => {
                  const nextRoomType = value ? String(value) : '';
                  const matched = roomTypeMaster.find((item) => item.name === nextRoomType);
                  const nextNightlyRate =
                    typeof matched?.nightlyRate === 'number' && Number.isFinite(matched.nightlyRate)
                      ? String(matched.nightlyRate)
                      : '';
                  setFormState((prev) => ({
                    ...prev,
                    roomType: nextRoomType,
                    roomNumber: '',
                    nightlyRate: nextNightlyRate,
                    totalAmount: nextNightlyRate
                      ? String(Math.round(Number(nextNightlyRate) * calculateTotalNights(prev.checkInDate, prev.checkOutDate)))
                      : ''
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    required
                    size="small"
                    placeholder={t('roomBookingManagement.placeholders.roomType')}
                  />
                )}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomBookingManagement.fields.checkIn')}
                <Box component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Box>
              </Typography>
              <TextField
                type="date"
                value={formState.checkInDate}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setFormState((prev) => ({ ...prev, checkInDate: nextValue }));
                  if (formState.nightlyRate) {
                    updateTotalFromNightly(formState.nightlyRate, nextValue, formState.checkOutDate);
                  }
                }}
                inputProps={{ min: canManagePastCheckIn ? undefined : todayIso }}
                fullWidth
                required
                size="small"
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomBookingManagement.fields.checkOut')}
                <Box component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Box>
              </Typography>
              <TextField
                type="date"
                value={formState.checkOutDate}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setFormState((prev) => ({ ...prev, checkOutDate: nextValue }));
                  if (formState.nightlyRate) {
                    updateTotalFromNightly(formState.nightlyRate, formState.checkInDate, nextValue);
                  }
                }}
                inputProps={{
                  min: formState.checkInDate || (canManagePastCheckIn ? undefined : todayIso)
                }}
                fullWidth
                required
                size="small"
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomBookingManagement.fields.roomNo')}
                {!selectedBooking && <Box component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Box>}
              </Typography>
              <Autocomplete
                freeSolo
                options={availableRoomOptions}
                value={formState.roomNumber}
                isOptionEqualToValue={(option, value) =>
                  typeof value === 'string'
                    ? option.roomNumber === value
                    : option.roomNumber === value.roomNumber
                }
                getOptionLabel={(option) =>
                  typeof option === 'string' ? option : option.roomName || option.roomNumber
                }
                onChange={(_, value) => {
                  const roomNumber =
                    typeof value === 'string' ? value : value?.roomNumber || '';
                  setFormState((prev) => ({ ...prev, roomNumber }));
                }}
                onInputChange={(_, value, reason) => {
                  if (reason === 'input' || reason === 'clear') {
                    setFormState((prev) => ({ ...prev, roomNumber: value }));
                  }
                }}
                disabled={!!selectedBooking}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    required={!selectedBooking}
                    size="small"
                    placeholder={t('roomBookingManagement.placeholders.roomNo')}
                    helperText={
                      !formState.roomType
                        ? t('roomBookingManagement.help.roomNoManual')
                        : !formState.checkInDate || !formState.checkOutDate
                          ? t('roomBookingManagement.help.roomNoManual')
                          : canSearchRooms && availableRoomOptions.length === 0
                            ? t('roomBookingManagement.help.noAvailableRoomManual')
                            : t('roomBookingManagement.help.roomNoManual')
                    }
                  />
                )}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomBookingManagement.fields.guestName')}
                <Box component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Box>
              </Typography>
              <Autocomplete
                freeSolo
                options={guestOptions}
                getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
                value={formState.guestName}
                onChange={(_, value) => {
                  if (typeof value === 'string') {
                    setFormState((prev) => ({ ...prev, guestName: value }));
                    return;
                  }
                  if (!value) {
                    setFormState((prev) => ({ ...prev, guestName: '' }));
                    return;
                  }
                  setFormState((prev) => ({
                    ...prev,
                    guestName: value.name,
                    guestEmail: value.email || prev.guestEmail,
                    guestPhone: value.phone || prev.guestPhone,
                    companyName: value.companyName || prev.companyName
                  }));
                }}
                onInputChange={(_, value) => {
                  setFormState((prev) => ({ ...prev, guestName: value }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    required
                    size="small"
                    placeholder={t('roomBookingManagement.placeholders.guestName')}
                  />
                )}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomBookingManagement.fields.companyName')}
              </Typography>
              <TextField
                value={formState.companyName}
                onChange={(e) => setFormState((prev) => ({ ...prev, companyName: e.target.value }))}
                fullWidth
                size="small"
                placeholder={t('roomBookingManagement.placeholders.companyName')}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomBookingManagement.fields.email')}
              </Typography>
              <TextField
                value={formState.guestEmail}
                onChange={(e) => setFormState((prev) => ({ ...prev, guestEmail: e.target.value }))}
                fullWidth
                size="small"
                placeholder={t('roomBookingManagement.placeholders.email')}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomBookingManagement.fields.checkinTime')}
              </Typography>
              <TextField
                type="time"
                value={formState.checkInTime}
                onChange={(e) => setFormState((prev) => ({ ...prev, checkInTime: e.target.value }))}
                fullWidth
                size="small"
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomBookingManagement.fields.checkoutTime')}
              </Typography>
              <TextField
                type="time"
                value={formState.checkOutTime}
                onChange={(e) => setFormState((prev) => ({ ...prev, checkOutTime: e.target.value }))}
                fullWidth
                size="small"
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomBookingManagement.fields.guestCount')}
              </Typography>
              <TextField
                type="number"
                value={formState.numberOfGuests}
                onChange={(e) => setFormState((prev) => ({ ...prev, numberOfGuests: Number(e.target.value) }))}
                fullWidth
                inputProps={{ min: 1 }}
                size="small"
                placeholder={t('roomBookingManagement.placeholders.guestCount')}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomBookingManagement.fields.phone')}
              </Typography>
              <TextField
                value={formState.guestPhone}
                onChange={(e) => setFormState((prev) => ({ ...prev, guestPhone: e.target.value }))}
                fullWidth
                size="small"
                placeholder={t('roomBookingManagement.placeholders.phone')}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomBookingManagement.fields.nightlyFee')}
              </Typography>
              <TextField
                value={formatCurrency(formState.nightlyRate)}
                onChange={(e) => updateTotalFromNightly(e.target.value)}
                fullWidth
                size="small"
                placeholder={t('roomBookingManagement.placeholders.nightlyFee')}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomBookingManagement.fields.totalAmount')}
                <Box component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Box>
              </Typography>
              <TextField
                value={formatCurrency(formState.totalAmount)}
                fullWidth
                required
                size="small"
                InputProps={{ readOnly: true }}
                placeholder={t('roomBookingManagement.placeholders.totalAmount')}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('roomBookingManagement.fields.specialRequests')}
              </Typography>
              <TextField
                value={formState.specialRequests}
                onChange={(e) => setFormState((prev) => ({ ...prev, specialRequests: e.target.value }))}
                fullWidth
                multiline
                minRows={2}
                size="small"
                placeholder={t('roomBookingManagement.placeholders.specialRequests')}
              />
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setOpenDialog(false);
            if (dialogOnly && onCloseDialog) {
              onCloseDialog();
            }
          }}
        >
          {t('common.cancel')}
        </Button>
        <Button variant="contained" onClick={handleSaveBooking} disabled={saving}>
          {selectedBooking ? t('common.edit') : t('roomBookingManagement.actions.book')}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const feedbackSnackbars = (
    <>
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
      >
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </>
  );

  useEffect(() => {
    if (!shouldAutoPrint) return;
    if (viewMode !== 'view' || !selectedBooking) return;
    setTimeout(() => {
      void handlePrintInvoice();
    }, 0);
    setShouldAutoPrint(false);
  }, [selectedBooking, shouldAutoPrint, viewMode]);

  const buildInvoicePdf = async (options?: {
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;
  }) => {
    if (!invoiceRef.current) return;
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc: Document) => {
          clonedDoc.body.classList.add('pdf-export');
          const style = clonedDoc.createElement('style');
          style.textContent = `
            body { margin: 0; padding: 0; font-size: 8pt; }
            .tax-invoice-print { width: 180mm; margin: 0; padding: 0; box-sizing: border-box; font-size: 8pt; }
            .tax-invoice-print * { font-size: 8pt; }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
    } finally {
      // no-op: avoid toggling live DOM to prevent flicker
    }
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const marginTop = options?.marginTop ?? 5;
    const marginRight = options?.marginRight ?? 5;
    const marginBottom = options?.marginBottom ?? 5;
    const marginLeft = options?.marginLeft ?? 5;
    const imgWidth = pageWidth - marginLeft - marginRight;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const printableHeight = pageHeight - marginTop - marginBottom;
    let heightLeft = imgHeight;
    let position = marginTop;

    pdf.addImage(imgData, 'PNG', marginLeft, position, imgWidth, imgHeight);
    heightLeft -= printableHeight;
    while (heightLeft > 0) {
      pdf.addPage();
      position = marginTop - (imgHeight - heightLeft);
      pdf.addImage(imgData, 'PNG', marginLeft, position, imgWidth, imgHeight);
      heightLeft -= printableHeight;
    }

    const buildDateToken = (value?: string): string => {
      const date = value ? new Date(value) : new Date();
      const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
      const y = safeDate.getFullYear();
      const m = String(safeDate.getMonth() + 1).padStart(2, '0');
      const d = String(safeDate.getDate()).padStart(2, '0');
      return `${y}${m}${d}`;
    };
    const sanitizeFilePart = (value: string) =>
      value.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
    const recipientLabel = sanitizeFilePart(billTo.company || billTo.name || 'Recipient');
    const descriptionLabel = sanitizeFilePart(invoiceDescription || 'Accommodation charge');
    const dateToken = buildDateToken(selectedBooking?.checkInDate);
    const filename = `${dateToken}_Invoice (${recipientLabel}) (${descriptionLabel}).pdf`;
    return { pdf, filename };
  };

  const handleDownloadPdf = async () => {
    const result = await buildInvoicePdf({
      marginLeft: 20,
      marginRight: 10
    });
    if (!result) return;
    const { pdf, filename } = result;
    pdf.save(filename);
  };

  const handlePrintInvoice = async () => {
    const result = await buildInvoicePdf();
    if (!result) return;
    const { pdf } = result;
    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          iframe.remove();
        }, 60_000);
      }
    };
    document.body.appendChild(iframe);
  };

  if (dialogOnly) {
    return (
      <>
        {bookingDialog}
        {feedbackSnackbars}
      </>
    );
  }

  if (viewMode === 'view' && selectedBooking) {
    const invoiceNights = Number(selectedBooking.totalNights || 1) || 1;
    const parsedInvoiceUnitPrice = Number(parseCurrencyInput(invoiceUnitPrice));
    const effectiveUnitPrice = Number.isFinite(parsedInvoiceUnitPrice)
      ? parsedInvoiceUnitPrice
      : 0;
    const invoiceSubtotal = Number((effectiveUnitPrice * invoiceNights).toFixed(2));
    const cgstAmount = invoiceSubtotal * (cgstRate / 100);
    const sgstAmount = invoiceSubtotal * (sgstRate / 100);
    const invoiceTotal = invoiceSubtotal * (1 + (cgstRate + sgstRate) / 100);

    return (
      <Box sx={{ ...mvsPageRootSx }} className="invoice-print-root">
        <Box className="no-print">
          <MvsPageHeader
            title="Tax Invoice"
            icon={<HotelIcon />}
            onBack={() => setViewMode('list')}
          />
        </Box>

        <Card elevation={0} sx={{ ...mvsBodyCardSx, overflow: 'hidden' }}>
          <CardContent
            ref={invoiceRef}
            className="tax-invoice-print"
            sx={{ p: { xs: 2.5, md: 4 }, lineHeight: 1.45 }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 3,
                mb: 3,
                flexWrap: 'wrap',
              }}
            >
              <Box sx={{ minWidth: 0, flex: '1 1 280px' }}>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 800, letterSpacing: '0.05em', color: 'text.primary', mb: 1 }}
                >
                  TAX INVOICE
                </Typography>
                {issuerCompany?.companyLogo && (
                  <Box sx={{ mb: 1.5 }}>
                    <AuthMedia
                      src={issuerCompany.companyLogo}
                      alt="Company logo"
                      style={{ height: 40, maxWidth: 200, objectFit: 'contain' }}
                    />
                  </Box>
                )}
                <Stack spacing={0.75}>
                  <Box>
                    <Typography component="span" sx={invoiceMetaLabelSx}>
                      Invoice No
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatInvoiceNumber(selectedBooking.id)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography component="span" sx={invoiceMetaLabelSx}>
                      Invoice Date
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {selectedBooking.checkInDate}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
              <Box
                sx={{
                  textAlign: 'right',
                  px: 2.5,
                  py: 1.75,
                  borderRadius: '14px',
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.18),
                  minWidth: 180,
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Total Amount
                </Typography>
                <Typography variant="h5" fontWeight={700} color="primary.main" sx={{ mt: 0.25 }}>
                  Rs. {formatCurrency(invoiceSubtotal)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedBooking.totalNights}
                  {t('roomBookingManagement.units.night')}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 2.5, borderColor: '#C5CED9' }} />

            <Grid container spacing={2} sx={{ mb: 2.5 }} alignItems="stretch">
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={invoicePanelSx}>
                  <Typography sx={invoicePanelTitleSx}>Issuer</Typography>
                  <Stack spacing={0.75}>
                    <Typography variant="body2" fontWeight={600}>
                      {issuerCompany?.name || '-'}
                    </Typography>
                    {issuerCompany?.businessNumber && (
                      <Typography variant="body2" color="text.secondary">
                        Business No: {issuerCompany.businessNumber}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                      {issuerCompany?.address || '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {issuerCompany?.phone || '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {issuerCompany?.email || '-'}
                    </Typography>
                  </Stack>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={invoicePanelSx}>
                  <Typography sx={invoicePanelTitleSx}>Bill To</Typography>
                  <Stack spacing={1}>
                    <Box>
                      <Typography sx={invoiceMetaLabelSx}>Name</Typography>
                      <InputBase
                        value={billTo.name}
                        onChange={(event) => setBillTo((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Name"
                        fullWidth
                        sx={billToInputSx}
                      />
                    </Box>
                    <Box>
                      <Typography sx={invoiceMetaLabelSx}>Company</Typography>
                      <InputBase
                        value={billTo.company}
                        onChange={(event) => setBillTo((prev) => ({ ...prev, company: event.target.value }))}
                        placeholder="Company"
                        fullWidth
                        sx={billToInputSx}
                      />
                    </Box>
                    <Box>
                      <Typography sx={invoiceMetaLabelSx}>Email</Typography>
                      <InputBase
                        value={billTo.email}
                        onChange={(event) => setBillTo((prev) => ({ ...prev, email: event.target.value }))}
                        placeholder="Email"
                        fullWidth
                        sx={billToInputSx}
                      />
                    </Box>
                    <Box>
                      <Typography sx={invoiceMetaLabelSx}>Phone</Typography>
                      <InputBase
                        value={billTo.phone}
                        onChange={(event) => setBillTo((prev) => ({ ...prev, phone: event.target.value }))}
                        placeholder="Phone"
                        fullWidth
                        sx={billToInputSx}
                      />
                    </Box>
                    <Box>
                      <Typography sx={invoiceMetaLabelSx}>GST</Typography>
                      <InputBase
                        value={billTo.gst}
                        onChange={(event) => setBillTo((prev) => ({ ...prev, gst: event.target.value }))}
                        placeholder="GST"
                        fullWidth
                        sx={billToInputSx}
                      />
                    </Box>
                  </Stack>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={invoicePanelSx}>
                  <Typography sx={invoicePanelTitleSx}>GST Details</Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography sx={invoiceMetaLabelSx}>GSTIN (Issuer)</Typography>
                      <Typography variant="body2">{issuerCompany?.gstNumbers?.[0] || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={invoiceMetaLabelSx}>GSTIN (Recipient)</Typography>
                      <InputBase
                        value={billTo.gst}
                        onChange={(event) => setBillTo((prev) => ({ ...prev, gst: event.target.value }))}
                        placeholder="GSTIN"
                        fullWidth
                        sx={billToInputSx}
                      />
                    </Box>
                    <Box>
                      <Typography sx={invoiceMetaLabelSx}>SAC Code</Typography>
                      <Typography variant="body2">996311</Typography>
                    </Box>
                    <Box>
                      <Typography sx={invoiceMetaLabelSx}>Supply Type</Typography>
                      <Typography variant="body2">{billTo.gst ? 'B2B' : 'B2C'}</Typography>
                    </Box>
                    <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                      <Typography sx={invoiceMetaLabelSx}>Place of Supply</Typography>
                      <InputBase
                        value={placeOfSupply}
                        onChange={(event) => setPlaceOfSupply(event.target.value)}
                        placeholder="State/UT"
                        fullWidth
                        sx={billToInputSx}
                      />
                    </Box>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={invoicePanelSx}>
                  <Typography sx={invoicePanelTitleSx}>Stay Details</Typography>
                  <Stack spacing={0.75}>
                    <Box>
                      <Typography sx={invoiceMetaLabelSx}>Room</Typography>
                      <Typography variant="body2">
                        {getRoomDisplayLabel(selectedBooking)} ({getRoomTypeLabel(selectedBooking.roomType)})
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={invoiceMetaLabelSx}>Guests</Typography>
                      <Typography variant="body2">{selectedBooking.numberOfGuests}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={invoiceMetaLabelSx}>Check-in</Typography>
                      <Typography variant="body2">
                        {selectedBooking.checkInDate}
                        {selectedBooking.checkInTime ? ` ${selectedBooking.checkInTime}` : ''}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={invoiceMetaLabelSx}>Check-out</Typography>
                      <Typography variant="body2">
                        {selectedBooking.checkOutDate}
                        {selectedBooking.checkOutTime ? ` ${selectedBooking.checkOutTime}` : ''}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Grid>
            </Grid>

            <TableContainer sx={{ ...mvsBodyListTableSx, mb: 2.5 }}>
              <Table size="small" sx={invoiceTableSx}>
                <TableHead sx={mvsTableHeadHighlightSx}>
                  <TableRow>
                    <TableCell width="34%">Description</TableCell>
                    <TableCell width="14%">Check-in</TableCell>
                    <TableCell width="14%">Check-out</TableCell>
                    <TableCell align="right" width="8%">
                      Qty
                    </TableCell>
                    <TableCell align="right" width="15%">
                      Unit Price
                    </TableCell>
                    <TableCell align="right" width="15%">
                      Amount
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody sx={mvsTableBodyRowSx}>
                  <TableRow>
                    <TableCell sx={invoiceCellSx}>
                      <InputBase
                        value={invoiceDescription}
                        onChange={(event) => setInvoiceDescription(event.target.value)}
                        fullWidth
                        placeholder="Accommodation charge"
                        sx={invoiceInputSx}
                      />
                    </TableCell>
                    <TableCell sx={invoiceCellSx}>{selectedBooking.checkInDate}</TableCell>
                    <TableCell sx={invoiceCellSx}>{selectedBooking.checkOutDate}</TableCell>
                    <TableCell align="right" sx={invoiceCellSx}>
                      {selectedBooking.totalNights}
                    </TableCell>
                    <TableCell align="right" sx={invoiceCellSx}>
                      <InputBase
                        value={formatCurrency(invoiceUnitPrice)}
                        onChange={(event) =>
                          setInvoiceUnitPrice(parseCurrencyInput(event.target.value))
                        }
                        inputProps={{
                          inputMode: 'numeric',
                          'aria-label': 'Unit Price'
                        }}
                        startAdornment={
                          <Typography
                            component="span"
                            variant="body2"
                            sx={{ mr: 0.5, whiteSpace: 'nowrap' }}
                          >
                            Rs.
                          </Typography>
                        }
                        sx={{
                          ...invoiceInputSx,
                          width: '100%',
                          '& input': { textAlign: 'right', minWidth: 72 }
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ ...invoiceCellSx, fontWeight: 600 }}>
                      Rs. {formatCurrency(invoiceSubtotal)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'flex-start',
                gap: { xs: 2, md: 4 },
                flexWrap: 'wrap',
              }}
            >
              <Box
                sx={{
                  minWidth: { xs: '100%', sm: 280 },
                  maxWidth: 340,
                  p: 2,
                  borderRadius: '14px',
                  border: '1px solid #C5CED9',
                  bgcolor: '#FAFBFC',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    Rs. {formatCurrency(invoiceSubtotal)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography variant="body2" color="text.secondary">
                      CGST
                    </Typography>
                    <FormControl size="small">
                      <Select
                        value={cgstRate}
                        onChange={(event) => handleCgstChange(Number(event.target.value))}
                        sx={invoiceTaxSelectSx}
                      >
                        {[2.5, 6, 9].map((rate) => (
                          <MenuItem key={rate} value={rate}>
                            {rate}%
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <Typography variant="body2" fontWeight={600}>
                    Rs. {formatCurrency(cgstAmount.toFixed(2))}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography variant="body2" color="text.secondary">
                      SGST
                    </Typography>
                    <FormControl size="small">
                      <Select
                        value={sgstRate}
                        onChange={(event) => handleSgstChange(Number(event.target.value))}
                        sx={invoiceTaxSelectSx}
                      >
                        {[2.5, 6, 9].map((rate) => (
                          <MenuItem key={rate} value={rate}>
                            {rate}%
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <Typography variant="body2" fontWeight={600}>
                    Rs. {formatCurrency(sgstAmount.toFixed(2))}
                  </Typography>
                </Box>
                <Divider sx={{ my: 1.25, borderColor: '#C5CED9' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Total
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                    Rs. {formatCurrency(invoiceTotal.toFixed(2))}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ textAlign: 'center', minWidth: 160, pt: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Authorised Signature
                </Typography>
                {issuerCompany?.authorizedSignature ? (
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                    <AuthMedia
                      src={issuerCompany.authorizedSignature}
                      alt="Authorized signature"
                      style={{ maxHeight: 72, maxWidth: 180, objectFit: 'contain' }}
                    />
                  </Box>
                ) : (
                  <Box sx={{ mt: 2.5, borderBottom: '1px solid', borderColor: 'divider', height: 48, width: 160, mx: 'auto' }} />
                )}
              </Box>
            </Box>

            {selectedBooking.specialRequests && (
              <Box
                sx={{
                  mt: 2.5,
                  p: 2,
                  borderRadius: '14px',
                  border: '1px solid #C5CED9',
                  bgcolor: '#FAFBFC',
                }}
              >
                <Typography sx={invoicePanelTitleSx}>Notes</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedBooking.specialRequests}
                </Typography>
              </Box>
            )}
          </CardContent>

          <Box
            className="no-print"
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              justifyContent: 'flex-end',
              px: { xs: 2.5, md: 4 },
              py: 2,
              borderTop: '1px solid #C5CED9',
              bgcolor: '#F8FAFC',
            }}
          >
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handlePrintInvoice}
              sx={mvsBodyOutlinedBtnSx}
            >
              {t('roomBookingManagement.actions.printInvoice')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadPdf}
              sx={mvsBodyOutlinedBtnSx}
            >
              {t('roomBookingManagement.actions.downloadPdf')}
            </Button>
            {selectedBooking.paymentStatus !== 'paid' && (
              <Button
                variant="contained"
                disableElevation
                onClick={handleSettleBooking}
                disabled={settling}
                sx={mvsBodyPrimaryBtnSx}
              >
                {t('roomBookingManagement.actions.settle')}
              </Button>
            )}
            {selectedBooking.status === 'confirmed' && (
              <Button
                variant="contained"
                color="info"
                disableElevation
                startIcon={<CheckCircleIcon />}
                onClick={() => handleCheckIn(selectedBooking.id)}
                sx={mvsBodyPrimaryBtnSx}
              >
                {t('roomBookingManagement.actions.checkin')}
              </Button>
            )}
            {selectedBooking.status === 'checked_in' && (
              <Button
                variant="contained"
                color="success"
                disableElevation
                startIcon={<CheckCircleIcon />}
                onClick={() => handleCheckOut(selectedBooking.id)}
                sx={mvsBodyPrimaryBtnSx}
              >
                {t('roomBookingManagement.actions.checkout')}
              </Button>
            )}
          </Box>
        </Card>

        <style>
          {`
            @page {
              size: A4;
              margin: 10mm;
            }
            @media print {
              html,
              body,
              #root {
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                margin: 0;
                background: #fff;
              }
              .no-print {
                display: none !important;
              }
              header,
              nav,
              aside,
              .MuiDrawer-root,
              .MuiAppBar-root,
              .MuiToolbar-root,
              .MuiBottomNavigation-root {
                display: none !important;
              }
              .invoice-print-root {
                position: fixed !important;
                inset: 0 !important;
                margin: 0 !important;
                padding: 10mm !important;
                border-radius: 0 !important;
                min-height: auto !important;
                width: 100% !important;
                background: #fff !important;
                z-index: 9999 !important;
                overflow: visible !important;
              }
              .invoice-print-root > .MuiCard-root {
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
              }
              .tax-invoice-print {
                width: 100%;
                max-width: none;
                padding: 0;
                box-sizing: border-box;
                background: #fff;
                box-shadow: none;
                visibility: visible !important;
                display: block !important;
                transform: scale(var(--invoice-print-scale, 1));
                transform-origin: top left;
                width: calc(100% / var(--invoice-print-scale, 1));
              }
            }
            body.pdf-export .no-pdf {
              display: none !important;
            }
            body.pdf-export .tax-invoice-print {
              width: 210mm;
              min-height: 297mm;
              padding: 5mm;
              box-sizing: border-box;
              background: #fff;
              font-size: 8pt;
              line-height: 1.25;
            }
            body.pdf-export .tax-invoice-print table,
            body.pdf-export .tax-invoice-print th,
            body.pdf-export .tax-invoice-print td {
              font-size: 8pt;
            }
          `}
        </style>
      </Box>
    );
  }

  return (
    <Box sx={{ ...mvsPageRootSx }}>
      <MvsPageHeader
        title={t('roomBookingManagement.title')}
        actions={
          <Button
            variant="contained"
            disableElevation
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            sx={mvsBodyPrimaryBtnSx}
          >
            {t('roomBookingManagement.actions.book')}
          </Button>
        }
      />

      {/* 필터 및 검색 */}
      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 3 }}>
        <Box
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 2,
            bgcolor: '#FFFFFF',
            ...roomBookingFilterFieldSx,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'minmax(180px, 2fr) repeat(4, minmax(110px, 1fr)) auto' },
            gap: 2,
            alignItems: 'flex-end',
          }}
        >
            <TextField
              fullWidth
              size="small"
              label={t('roomBookingManagement.filters.search')}
              placeholder={t('roomBookingManagement.placeholders.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={roomBookingFilterFieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              size="small"
              select
              label={t('roomBookingManagement.filters.status')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) => (selected ? selected : t('roomBookingManagement.filters.all')),
              }}
              sx={roomBookingFilterFieldSx}
            >
              <MenuItem value="">{t('roomBookingManagement.filters.all')}</MenuItem>
              <MenuItem value="confirmed">{t('roomBookingManagement.status.confirmed')}</MenuItem>
              <MenuItem value="pending">{t('roomBookingManagement.status.pending')}</MenuItem>
              <MenuItem value="checked_in">{t('roomBookingManagement.status.checkedIn')}</MenuItem>
              <MenuItem value="checked_out">{t('roomBookingManagement.status.checkedOut')}</MenuItem>
              <MenuItem value="cancelled">{t('roomBookingManagement.status.cancelled')}</MenuItem>
              <MenuItem value="no_show">{t('roomBookingManagement.status.noShow')}</MenuItem>
            </TextField>
            <TextField
              fullWidth
              size="small"
              select
              label={t('roomBookingManagement.filters.roomType')}
              value={roomTypeFilter}
              onChange={(e) => setRoomTypeFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) => (selected ? selected : t('roomBookingManagement.filters.all')),
              }}
              sx={roomBookingFilterFieldSx}
            >
              <MenuItem value="">{t('roomBookingManagement.filters.all')}</MenuItem>
              <MenuItem value="standard">{t('roomBookingManagement.roomTypes.standard')}</MenuItem>
              <MenuItem value="deluxe">{t('roomBookingManagement.roomTypes.deluxe')}</MenuItem>
              <MenuItem value="suite">{t('roomBookingManagement.roomTypes.suite')}</MenuItem>
              <MenuItem value="presidential">{t('roomBookingManagement.roomTypes.presidential')}</MenuItem>
            </TextField>
            <TextField
              fullWidth
              size="small"
              select
              label={t('roomBookingManagement.filters.payment')}
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) => (selected ? selected : t('roomBookingManagement.filters.all')),
              }}
              sx={roomBookingFilterFieldSx}
            >
              <MenuItem value="">{t('roomBookingManagement.filters.all')}</MenuItem>
              <MenuItem value="paid">{t('roomBookingManagement.filters.paidOption')}</MenuItem>
              <MenuItem value="unpaid">{t('roomBookingManagement.filters.unpaidOption')}</MenuItem>
            </TextField>
            <TextField
              fullWidth
              type="date"
              label={t('roomBookingManagement.filters.date')}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={roomBookingFilterFieldSx}
            />
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setRoomTypeFilter('');
                setPaymentFilter('');
                setDateFilter('');
              }}
              sx={{
                ...mvsBodyOutlinedBtnSx,
                height: 40,
                whiteSpace: 'nowrap',
                width: { xs: '100%', sm: 'auto' },
                minWidth: { sm: 120 },
              }}
            >
              {t('roomBookingManagement.actions.reset')}
            </Button>
        </Box>
      </Card>

      {/* 예약 목록 테이블 */}
      <Box sx={mvsBodyListZoneSx}>
        {sortedPaginatedBookings.length === 0 ? (
          <Box sx={listStateBoxSx}>
            <Typography variant="body2" color="text.secondary">
              {filteredBookings.length === 0
                ? t('roomBookingManagement.empty.noData', { defaultValue: '표시할 예약이 없습니다.' })
                : t('roomBookingManagement.empty.noSearchResults', { defaultValue: '검색 결과가 없습니다.' })}
            </Typography>
          </Box>
        ) : (
          <TableContainer
            sx={{
              ...mvsBodyListTableSx,
              ...mvsTableScrollSx,
              overflowX: 'hidden',
              overflowY: 'visible',
            }}
          >
            <Table size="small" sx={bookingTableSx}>
              <TableHead sx={mvsTableHeadHighlightSx}>
                <TableRow>
                  {[
                    { label: t('roomBookingManagement.columns.sequence'), width: '4%', align: 'center' as const },
                    { label: t('roomBookingManagement.columns.guestName'), key: 'guestName', width: '11%', ellipsis: true },
                    { label: t('roomBookingManagement.columns.companyName'), key: 'companyName', width: '13%', ellipsis: true },
                    { label: t('roomBookingManagement.columns.roomNo'), key: 'roomNumber', width: '7%' },
                    { label: t('roomBookingManagement.columns.checkIn'), key: 'checkInDate', width: '9%' },
                    { label: t('roomBookingManagement.columns.checkOut'), key: 'checkOutDate', width: '9%' },
                    { label: t('roomBookingManagement.columns.nights'), key: 'totalNights', width: '7%' },
                    { label: t('roomBookingManagement.columns.nightlyRate'), key: 'nightlyRate', width: '9%' },
                    { label: t('roomBookingManagement.columns.amount'), key: 'totalAmount', width: '9%' },
                    { label: t('roomBookingManagement.columns.payment'), key: 'paymentStatus', width: '12%', align: 'center' as const },
                    { label: t('roomBookingManagement.columns.status'), key: 'status', width: '10%' },
                  ].map((col) => (
                    <TableCell
                      key={col.label}
                      align={col.align ?? 'left'}
                      width={col.width}
                      sx={{
                        whiteSpace: 'nowrap',
                        cursor: col.key ? 'pointer' : 'default',
                        verticalAlign: 'middle',
                        overflow: 'visible',
                      }}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.key ? (
                        <TableSortLabel
                          active={sortKey === col.key}
                          direction={sortKey === col.key ? sortDirection : 'asc'}
                          sx={{
                            color: 'inherit',
                            maxWidth: '100%',
                            '& .MuiTableSortLabel-icon': { color: 'inherit', flexShrink: 0 },
                          }}
                        >
                          {col.label}
                        </TableSortLabel>
                      ) : (
                        col.label
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody sx={mvsTableBodyRowSx}>
                {sortedPaginatedBookings.map((booking, rowIndex) => (
                  <TableRow
                    key={booking.id}
                    hover
                    onClick={() => handleViewBooking(booking)}
                    sx={{ cursor: 'pointer', '&:active': { bgcolor: 'action.selected' } }}
                  >
                    <TableCell
                      align="center"
                      sx={{
                        ...bookingCellBaseSx,
                        whiteSpace: 'nowrap',
                        color: 'text.secondary',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {(page - 1) * itemsPerPage + rowIndex + 1}
                    </TableCell>
                    {[
                      { value: booking.guestName, ellipsis: true },
                      { value: booking.companyName || '-', ellipsis: true },
                      { value: getRoomDisplayLabel(booking), ellipsis: false },
                      { value: booking.checkInDate, ellipsis: false },
                      { value: booking.checkOutDate, ellipsis: false },
                      { value: `${booking.totalNights}${t('roomBookingManagement.units.night')}`, ellipsis: false },
                      { value: `Rs. ${booking.totalNights ? Math.round(booking.totalAmount / booking.totalNights).toLocaleString() : '-'}`, ellipsis: false },
                      { value: `Rs. ${booking.totalAmount.toLocaleString()}`, ellipsis: false },
                    ].map((cell, index) => (
                      <TableCell
                        key={`${booking.id}-${index}`}
                        sx={{
                          ...bookingCellBaseSx,
                          ...(cell.ellipsis
                            ? bookingCellEllipsisSx
                            : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
                        }}
                      >
                        {cell.ellipsis ? renderEllipsisText(String(cell.value)) : cell.value}
                      </TableCell>
                    ))}
                    <TableCell align="center" sx={bookingChipCellSx}>
                      <Box sx={{ display: 'inline-flex', justifyContent: 'center', maxWidth: '100%' }}>
                        {getPaymentStatusChip(booking.paymentStatus)}
                      </Box>
                    </TableCell>
                    <TableCell sx={bookingChipCellSx}>
                      <Box sx={{ display: 'inline-flex', maxWidth: '100%' }}>
                        {getStatusChip(booking.status)}
                      </Box>
                    </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        )}

        {filteredBookings.length > 0 && (
          <Box sx={mvsBodyPaginationSx}>
            <Pagination
              count={Math.ceil(filteredBookings.length / itemsPerPage)}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </Box>

      <Dialog
        open={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('roomBookingManagement.dialog.actionTitle')}</DialogTitle>
        <DialogContent>
          {selectedBooking && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('roomBookingManagement.dialog.actionDescription', {
                  guest: selectedBooking.guestName,
                  room: getRoomDisplayLabel(selectedBooking),
                })}
              </Typography>
              <Stack spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => {
                    setActionDialogOpen(false);
                    openBookingEditForm(selectedBooking);
                  }}
                  sx={{ ...mvsBodyOutlinedBtnSx, justifyContent: 'flex-start' }}
                >
                  {t('roomBookingManagement.dialog.editBooking')}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={() => {
                    setActionDialogOpen(false);
                    setViewMode('view');
                  }}
                  sx={{ ...mvsBodyOutlinedBtnSx, justifyContent: 'flex-start' }}
                >
                  {t('roomBookingManagement.actions.invoice')}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  disabled={
                    selectedBooking.status === 'cancelled' ||
                    selectedBooking.status === 'checked_out'
                  }
                  onClick={() => {
                    setActionDialogOpen(false);
                    openCancelDialog(selectedBooking.id);
                  }}
                  sx={{ ...mvsBodyOutlinedBtnSx, justifyContent: 'flex-start' }}
                >
                  {t('roomBookingManagement.actions.cancel')}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => {
                    setActionDialogOpen(false);
                    openDeleteDialog(selectedBooking.id);
                  }}
                  sx={{ ...mvsBodyOutlinedBtnSx, justifyContent: 'flex-start' }}
                >
                  {t('roomBookingManagement.actions.delete')}
                </Button>
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      {bookingDialog}
      {feedbackSnackbars}
      <Dialog open={cancelDialogOpen} onClose={closeCancelDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{t('roomBookingManagement.dialog.cancelTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t('roomBookingManagement.dialog.cancelMessage')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCancelDialog}>{t('roomBookingManagement.dialog.no')}</Button>
          <Button variant="contained" color="error" onClick={confirmCancelBooking}>
            {t('roomBookingManagement.dialog.proceedCancel')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{t('roomBookingManagement.dialog.deleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t('roomBookingManagement.dialog.deleteMessage')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>{t('roomBookingManagement.dialog.no')}</Button>
          <Button variant="contained" color="error" onClick={confirmDeleteBooking}>
            {t('roomBookingManagement.dialog.proceedDelete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoomBookingManagement;
