import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
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
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Badge,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Pagination,
  DialogContentText,
  Tabs,
  Tab,
  CircularProgress,
  Switch,
  FormControlLabel
} from '@mui/material';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import {
  mvsBodyCardSx,
  mvsBodyFilterWrapSx,
  mvsBodyListTableSx,
  mvsBodyListZoneSx,
  mvsBodyOutlinedBtnSx,
  mvsBodyPaginationSx,
  mvsBodyPrimaryBtnSx,
  mvsFilterFieldHeightSx,
  mvsOutlinedLabelProps,
  mvsPageRootSx,
  mvsSearchFieldSx,
  mvsTableBodyRowSx,
  mvsTableHeadHighlightSx,
  mvsTableScrollSx,
} from '../../theme/mvsLayout';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Flag as PriorityIcon,
  Public as PublicIcon,
  Group as GroupIcon,
  Email as EmailIcon,
  Send as SendIcon,
  Edit as DraftIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  RestartAlt as ResetIcon,
  CalendarToday as CalendarTodayIcon,
  Business as BusinessIcon,
  Category as CategoryIcon,
  Timeline as TimelineIcon,
  AttachFile as AttachFileIcon,
  VisibilityOff as VisibilityOffIcon,
  Visibility as VisibilityIcon,
  Warning as WarningIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  FormatAlignLeft as FormatAlignLeftIcon,
  FormatAlignCenter as FormatAlignCenterIcon,
  FormatAlignRight as FormatAlignRightIcon,
  Image as ImageIcon,
  FormatColorText as FormatColorTextIcon,
  Palette as PaletteIcon,
  PushPin as PushPinIcon
} from '@mui/icons-material';
import { useStore } from '../../store';
import { noticeService, userUiPreferencesService } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { useMenuRoutePermissionFlags } from '../../hooks/useMenuRoutePermissionFlags';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Node, mergeAttributes } from '@tiptap/core';
import { Table as TableExtension } from '@tiptap/extension-table';
import { TableRow as TableRowExtension } from '@tiptap/extension-table-row';
import { TableCell as TableCellExtension } from '@tiptap/extension-table-cell';
import { TableHeader as TableHeaderExtension } from '@tiptap/extension-table-header';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';

interface Notice {
  id: number;
  title: string;
  content: string;
  category: 'general' | 'urgent' | 'maintenance' | 'policy' | 'event';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'published' | 'archived';
  isPublic: boolean;
  targetAudience: 'all' | 'employees' | 'managers' | 'specific';
  author: string;
  authorId: number;
  createdAt: string;
  publishedAt?: string;
  expiresAt?: string;
  attachments?: string[];
  readCount: number;
  views: number;
  isPinned?: boolean;
}

interface CalendarScheduleItem {
  id: string;
  title: string;
  type: 'normal' | 'company_holiday';
}

const CompanyHolidayStarIcon: React.FC<{ color: string }> = ({ color }) => (
  <Box
    component="svg"
    viewBox="0 0 24 24"
    sx={{
      width: 14,
      height: 14,
      display: 'inline-block',
      transform: 'rotate(-12deg)'
    }}
  >
    <path
      d="M12 2.8L14.8 9.2L21.6 9.8L16.3 14.3L17.9 21L12 17.3L6.1 21L7.7 14.3L2.4 9.8L9.2 9.2L12 2.8Z"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Box>
);

// 이미지 리사이즈 가능한 확장
const ResizableImage = Image.extend({
  group: 'block',
  inline: false,
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) {
            return {};
          }
          return {
            width: attributes.width,
            style: `width: ${attributes.width}px; height: auto; display: block;`,
          };
        },
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes => {
          if (!attributes.height) {
            return {};
          }
          return {
            height: attributes.height,
          };
        },
      },
    };
  },
});

/** 연간 스케줄표 달력 표시 크기 (기준 대비 약 20% 확대) */
const YEARLY_CALENDAR_SCALE = 1.2;
const ycsRem = (rem: number) => `${rem * YEARLY_CALENDAR_SCALE}rem`;
const ycsSp = (u: number) => u * YEARLY_CALENDAR_SCALE;

// HTML 태그 제거 함수
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const NOTICE_MENU_ROUTES = ['/communication/notice', '/communication/notices', '/communication'];

const NoticeManagement: React.FC = () => {
  const theme = useTheme();
  const { user } = useStore();
  const { i18n, t } = useTranslation();
  const noticeMenuFlags = useMenuRoutePermissionFlags(NOTICE_MENU_ROUTES);

  /** 연간 스케줄표: 등록·수정(저장)은 admin/root만 */
  const canManageYearlySchedule = useMemo(
    () => user?.role === 'admin' || user?.role === 'root',
    [user?.role]
  );

  /** 메뉴 `수정`(can_edit)이 있을 때만 — 본인 글이어도 등록만 있으면 수정 UI는 숨김(정책). admin/root는 메뉴 수정권한으로 허용 */
  const canUserEditNotice = (n: Notice | null) => {
    if (!n || !user) return false;
    if (!noticeMenuFlags.canEdit) return false;
    if (user.role === 'root' || user.role === 'admin') return true;
    const aid = Number((n as any).authorId ?? (n as any).author_id);
    return Number.isFinite(aid) && Number(user.id) === aid;
  };

  const isNoticeAuthor = (n: Notice | null) => {
    if (!n || !user) return false;
    const aid = Number((n as any).authorId ?? (n as any).author_id);
    return Number.isFinite(aid) && Number(user.id) === aid;
  };

  const isEn = i18n.language === 'en';
  const txt = (ko: string, en: string) => (isEn ? en : ko);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'edit'>('list');
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState<Notice | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState(0); // 0: 공지사항, 1: 연간 스케줄표
  const [currentDate, setCurrentDate] = useState(new Date()); // 달력 현재 날짜
  const [customSchedules, setCustomSchedules] = useState<Record<string, CalendarScheduleItem[]>>({});
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<Date | null>(null);
  const [newScheduleTitle, setNewScheduleTitle] = useState('');
  const [scheduleAsCompanyHoliday, setScheduleAsCompanyHoliday] = useState(false);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableHasHeader, setTableHasHeader] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    isPublic: true,
    targetAudience: 'all' as 'all' | 'employees' | 'managers' | 'specific',
    isPinned: false, // 고정하기
    attachments: [] as string[]
  });
  const skipSchedulePersistRef = useRef(true);
  const [scheduleStorageReady, setScheduleStorageReady] = useState(false);

  // Tiptap 에디터 설정
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'resizable-image',
          style: 'display: block; margin: 12px auto; max-width: 100%; clear: both;',
        },
      }),
      TableExtension.configure({
        resizable: true,
      }),
      TableRowExtension,
      TableHeaderExtension,
      TableCellExtension,
      TextStyle,
      Color,
      FontFamily,
      TextAlign.configure({
        types: ['heading', 'paragraph', 'image'],
        defaultAlignment: 'left',
      }),
    ],
    content: formData.content,
    onUpdate: ({ editor }: { editor: any }) => {
      setFormData({ ...formData, content: editor.getHTML() });
    },
    editorProps: {
      handlePaste: (view: any, event: ClipboardEvent) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf('image') !== -1) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const result = e.target?.result as string;
                  if (result && editor) {
                    editor.chain()
                      .focus()
                      .setImage({ src: result })
                      .run();
                  }
                };
                reader.readAsDataURL(file);
              }
              return true;
            }
          }
        }
        
        // 엑셀/구글 시트에서 복사한 HTML 테이블 처리
        const htmlData = event.clipboardData?.getData('text/html');
        const textData = event.clipboardData?.getData('text/plain');
        
        if (htmlData && htmlData.includes('<table') && editor) {
          event.preventDefault();
          editor.chain()
            .focus()
            .insertContent(htmlData)
            .run();
          return true;
        } else if (textData && textData.includes('\t') && editor) {
          // 탭으로 구분된 텍스트 (엑셀 복사 시)
          event.preventDefault();
          const lines = textData.split('\n').filter(line => line.trim());
          if (lines.length > 0) {
            const rows = lines.map(line => line.split('\t').map(cell => cell.trim()));
            const maxCols = Math.max(...rows.map(row => row.length), 1);
            
            if (rows.length > 0 && maxCols > 0) {
              let tableHTML = '<table><tbody>';
              rows.forEach((row) => {
                tableHTML += '<tr>';
                for (let i = 0; i < maxCols; i++) {
                  const cellText = row[i] || '';
                  tableHTML += `<td>${cellText}</td>`;
                }
                tableHTML += '</tr>';
              });
              tableHTML += '</tbody></table>';
              
              editor.chain()
                .focus()
                .insertContent(tableHTML)
                .run();
              
              return true;
            }
          }
        }
        
        return false;
      },
    },
  });

  // formData.content가 변경되면 에디터 내용 업데이트
  useEffect(() => {
    if (editor && formData.content !== editor.getHTML()) {
      editor.commands.setContent(formData.content || '');
    }
  }, [formData.content, editor]);

  const toDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!user?.id) {
      setScheduleStorageReady(false);
      setCustomSchedules({});
      return;
    }

    let cancelled = false;
    setScheduleStorageReady(false);
    skipSchedulePersistRef.current = true;

    userUiPreferencesService
      .get()
      .then((data) => {
        if (cancelled) return;
        const raw = data.calendarSchedules || {};
        const sanitized: Record<string, CalendarScheduleItem[]> = {};
        Object.entries(raw).forEach(([dateKey, value]) => {
          if (!Array.isArray(value)) return;
          const list: CalendarScheduleItem[] = value
            .filter((item: any) => item && typeof item.title === 'string')
            .map((item: any) => ({
              id: String(item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
              title: String(item.title).trim(),
              type: (item.type === 'company_holiday' ? 'company_holiday' : 'normal') as 'normal' | 'company_holiday'
            }))
            .filter((item) => item.title.length > 0);
          if (list.length > 0) sanitized[dateKey] = list;
        });
        setCustomSchedules(sanitized);
        requestAnimationFrame(() => {
          setScheduleStorageReady(true);
          setTimeout(() => {
            skipSchedulePersistRef.current = false;
          }, 400);
        });
      })
      .catch(() => {
        if (!cancelled) {
          setCustomSchedules({});
          requestAnimationFrame(() => {
            setScheduleStorageReady(true);
            setTimeout(() => {
              skipSchedulePersistRef.current = false;
            }, 400);
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !scheduleStorageReady || skipSchedulePersistRef.current) return;
    if (!canManageYearlySchedule) return;
    const t = window.setTimeout(() => {
      userUiPreferencesService.patch({ calendarSchedules: customSchedules }).catch(() => {});
    }, 500);
    return () => window.clearTimeout(t);
  }, [user?.id, customSchedules, scheduleStorageReady, canManageYearlySchedule]);

  const openScheduleDialog = (date: Date) => {
    setSelectedScheduleDate(date);
    setNewScheduleTitle('');
    setScheduleAsCompanyHoliday(false);
    setScheduleDialogOpen(true);
  };

  const closeScheduleDialog = () => {
    setScheduleDialogOpen(false);
    setSelectedScheduleDate(null);
    setNewScheduleTitle('');
    setScheduleAsCompanyHoliday(false);
  };

  const handleAddSchedule = () => {
    if (!canManageYearlySchedule) return;
    if (!selectedScheduleDate) return;
    const rawTitle = newScheduleTitle.trim();
    const title =
      rawTitle ||
      (scheduleAsCompanyHoliday ? txt('회사 휴일', 'Company Holiday') : '');
    if (!title) return;

    const dateKey = toDateKey(selectedScheduleDate);
    setCustomSchedules((prev) => {
      const existing = prev[dateKey] || [];
      return {
        ...prev,
        [dateKey]: [
          ...existing,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title,
            type: scheduleAsCompanyHoliday ? 'company_holiday' : 'normal'
          }
        ]
      };
    });
    setNewScheduleTitle('');
    setScheduleAsCompanyHoliday(false);
  };

  const handleDeleteSchedule = (dateKey: string, scheduleId: string) => {
    if (!canManageYearlySchedule) return;
    setCustomSchedules((prev) => {
      const existing = prev[dateKey] || [];
      const updated = existing.filter((item) => item.id !== scheduleId);
      if (updated.length === 0) {
        const { [dateKey]: _deleted, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [dateKey]: updated
      };
    });
  };

  const loadData = useCallback(async () => {
    if (noticeMenuFlags.menusLoading || !noticeMenuFlags.canRead) {
      setNotices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await noticeService.getNotices({
        page,
        limit: itemsPerPage,
        search: searchTerm,
        status: statusFilter
      });
      
      if (response.success && response.data) {
        setNotices(response.data);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1);
        }
      } else {
        setNotices([]);
      }
    } catch (error: any) {
      console.error('데이터 로드 오류:', error);
      setError(error.response?.data?.message || '데이터를 불러오는데 실패했습니다.');
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage, noticeMenuFlags.canRead, noticeMenuFlags.menusLoading, page, searchTerm, statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const getCategoryChip = (category: string) => {
    switch (category) {
      case 'general':
        return <Chip label={txt('일반', 'General')} color="default" size="small" />;
      case 'urgent':
        return <Chip label={txt('긴급', 'Urgent')} color="error" size="small" />;
      case 'maintenance':
        return <Chip label={txt('점검', 'Maintenance')} color="warning" size="small" />;
      case 'policy':
        return <Chip label={txt('정책', 'Policy')} color="info" size="small" />;
      case 'event':
        return <Chip label={txt('행사', 'Event')} color="success" size="small" />;
      default:
        return <Chip label={txt('알 수 없음', 'Unknown')} color="default" size="small" />;
    }
  };

  const getPriorityChip = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Chip label={txt('낮음', 'Low')} color="default" size="small" />;
      case 'medium':
        return <Chip label={txt('보통', 'Medium')} color="info" size="small" />;
      case 'high':
        return <Chip label={txt('높음', 'High')} color="warning" size="small" />;
      case 'urgent':
        return <Chip label={txt('긴급', 'Urgent')} color="error" size="small" />;
      default:
        return <Chip label={txt('알 수 없음', 'Unknown')} color="default" size="small" />;
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'draft':
        return <Chip label={txt('임시저장', 'Draft')} color="default" size="small" />;
      case 'published':
        return <Chip label={txt('게시됨', 'Published')} color="success" size="small" />;
      case 'archived':
        return <Chip label={txt('보관됨', 'Archived')} color="info" size="small" />;
      default:
        return <Chip label={txt('알 수 없음', 'Unknown')} color="default" size="small" />;
    }
  };

  const getTargetAudienceLabel = (audience: string) => {
    switch (audience) {
      case 'all':
        return txt('전체', 'All');
      case 'employees':
        return txt('직원', 'Employees');
      case 'managers':
        return txt('관리자', 'Managers');
      case 'specific':
        return txt('특정 대상', 'Specific');
      default:
        return txt('알 수 없음', 'Unknown');
    }
  };

  const handleViewNotice = async (notice: Notice) => {
    try {
      // 상세 정보 로드 (조회수 증가를 위해)
      const response = await noticeService.getNotice(notice.id);
      if (response.success) {
        setSelectedNotice(response.data);
        setViewMode('view');
      } else {
        setError('공지사항을 불러오는데 실패했습니다.');
      }
    } catch (error: any) {
      console.error('공지사항 상세 조회 오류:', error);
      setError(error.response?.data?.message || '공지사항을 불러오는데 실패했습니다.');
      // 에러가 발생해도 기본 정보로 표시
      setSelectedNotice(notice);
      setViewMode('view');
    }
  };

  const handleEditNotice = (notice: Notice) => {
    if (!canUserEditNotice(notice)) return;
    setSelectedNotice(notice);
    // 에디터 내용 설정을 위해 먼저 formData 설정
    const editFormData = {
      title: notice.title,
      content: notice.content,
      status: 'published' as 'draft' | 'published' | 'archived',
      isPublic: notice.isPublic,
      targetAudience: notice.targetAudience,
      isPinned: (notice as any).isPinned || false, // 고정하기
      attachments: notice.attachments || []
    };
    setFormData(editFormData);
    
    // 에디터가 있으면 내용 설정
    if (editor) {
      editor.commands.setContent(notice.content || '');
    }
    
    // 같은 페이지에서 수정 모드로 전환
    setIsEditing(true);
    setViewMode('edit');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setViewMode('view');
    // 원래 데이터로 복원
    if (selectedNotice) {
      if (editor) {
        editor.commands.setContent(selectedNotice.content || '');
      }
    }
  };

  const handleSaveEdit = async () => {
    try {
      if (!selectedNotice || !canUserEditNotice(selectedNotice)) {
        setError(isEn ? 'You do not have permission to edit notices.' : '공지사항을 수정할 권한이 없습니다.');
        return;
      }
      const contentText = editor ? editor.getText().trim() : formData.content.trim();
      if (!formData.title.trim() || !contentText) {
        setError('제목과 내용은 필수입니다.');
        return;
      }

      if (!selectedNotice) return;

      const noticeData = {
        title: formData.title,
        content: formData.content,
        status: 'published', // 저장 시 자동으로 게시됨
        isPublic: true, // 항상 공개
        targetAudience: formData.targetAudience,
        isPinned: formData.isPinned, // 고정하기
        attachments: formData.attachments
      };

      const response = await noticeService.updateNotice(selectedNotice.id, noticeData);
      if (response.success) {
        setSuccess('공지사항이 수정되었습니다.');
        setIsEditing(false);
        setViewMode('view');
        // 업데이트된 데이터 다시 로드
        const updatedResponse = await noticeService.getNotice(selectedNotice.id);
        if (updatedResponse.success) {
          setSelectedNotice(updatedResponse.data);
        }
        loadData();
      } else {
        setError(response.message || '수정 중 오류가 발생했습니다.');
      }
    } catch (error: any) {
      console.error('공지사항 수정 오류:', error);
      setError(error.response?.data?.message || '수정 중 오류가 발생했습니다.');
    }
  };

  const handleOpenCreateDialog = () => {
    if (!noticeMenuFlags.canCreate) {
      setError(isEn ? 'You do not have permission to create notices.' : '공지사항을 등록할 권한이 없습니다.');
      return;
    }
    setSelectedNotice(null);
    setFormData({
      title: '',
      content: '',
      status: 'published', // 저장 시 자동으로 게시됨
      isPublic: true,
      targetAudience: 'all',
      isPinned: false, // 고정하기
      attachments: []
    });
    setOpenDialog(true);
  };

  const handleSaveNotice = async () => {
    try {
      const contentText = editor ? editor.getText().trim() : formData.content.trim();
      if (!formData.title.trim() || !contentText) {
        setError('제목과 내용은 필수입니다.');
        return;
      }

      const noticeData = {
        title: formData.title,
        content: formData.content,
        status: 'published', // 저장 시 자동으로 게시됨
        isPublic: true, // 항상 공개
        targetAudience: formData.targetAudience,
        isPinned: formData.isPinned, // 고정하기
        attachments: formData.attachments
      };

      if (selectedNotice) {
        if (!canUserEditNotice(selectedNotice)) {
          setError(isEn ? 'You do not have permission to edit notices.' : '공지사항을 수정할 권한이 없습니다.');
          return;
        }
        // 수정
        const response = await noticeService.updateNotice(selectedNotice.id, noticeData);
        if (response.success) {
          setSuccess('공지사항이 수정되었습니다.');
          setOpenDialog(false);
          setSelectedNotice(null);
          loadData();
        } else {
          setError(response.message || '수정 중 오류가 발생했습니다.');
        }
      } else {
        if (!noticeMenuFlags.canCreate) {
          setError(isEn ? 'You do not have permission to create notices.' : '공지사항을 등록할 권한이 없습니다.');
          return;
        }
        // 생성
        const response = await noticeService.createNotice(noticeData);
        if (response.success) {
          setSuccess('공지사항이 작성되었습니다.');
          setOpenDialog(false);
          setSelectedNotice(null);
          loadData();
        } else {
          setError(response.message || '작성 중 오류가 발생했습니다.');
        }
      }
    } catch (error: any) {
      console.error('공지사항 저장 오류:', error);
      setError(error.response?.data?.message || '저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteNotice = (notice: Notice) => {
    if (!noticeMenuFlags.canDelete) {
      setError(isEn ? 'You do not have permission to delete notices.' : '공지사항을 삭제할 권한이 없습니다.');
      return;
    }
    setNoticeToDelete(notice);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteNotice = async () => {
    if (!noticeToDelete) return;
    if (!noticeMenuFlags.canDelete) {
      setError(isEn ? 'You do not have permission to delete notices.' : '공지사항을 삭제할 권한이 없습니다.');
      return;
    }

    try {
      const response = await noticeService.deleteNotice(noticeToDelete.id);
      if (response.success) {
        setSuccess('공지사항이 성공적으로 삭제되었습니다.');
        setDeleteDialogOpen(false);
        setNoticeToDelete(null);
        loadData();
      } else {
        setError(response.message || '삭제 중 오류가 발생했습니다.');
      }
    } catch (error: any) {
      console.error('삭제 오류:', error);
      setError(error.response?.data?.message || '삭제 중 오류가 발생했습니다.');
    }
  };


  const totalNotices = notices.length;
  const publishedNotices = notices.filter(notice => notice.status === 'published').length;
  const draftNotices = notices.filter(notice => notice.status === 'draft').length;
  const urgentNotices = notices.filter(notice => notice.priority === 'urgent').length;

  const getGoodFriday = (year: number): Date => {
    // Gregorian Easter Sunday 계산(Anonymous Gregorian algorithm)
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    const easterSunday = new Date(year, month - 1, day);
    const goodFriday = new Date(easterSunday);
    goodFriday.setDate(easterSunday.getDate() - 2);
    return goodFriday;
  };

  const getIndianHolidayMap = (year: number): Record<string, string[]> => {
    const holidayMap: Record<string, string[]> = {};
    const addHoliday = (date: Date, name: string) => {
      const key = toDateKey(date);
      holidayMap[key] = [...(holidayMap[key] || []), name];
    };
    const addYearHoliday = (targetYear: number, month: number, day: number, name: string) => {
      if (year === targetYear) {
        addHoliday(new Date(targetYear, month, day), name);
      }
    };

    // 고정 공휴일
    addHoliday(new Date(year, 0, 1), 'New Year');
    addHoliday(new Date(year, 0, 26), 'Republic Day');
    addHoliday(new Date(year, 0, 14), 'Makar Sankranti');
    addHoliday(new Date(year, 4, 1), 'Labour Day');
    addHoliday(new Date(year, 7, 15), 'Independence Day');
    addHoliday(new Date(year, 9, 2), 'Gandhi Jayanti');
    addHoliday(new Date(year, 3, 14), 'Dr. Ambedkar Jayanti');
    addHoliday(new Date(year, 11, 25), 'Christmas');

    // 변동 공휴일
    addHoliday(getGoodFriday(year), 'Good Friday');

    const pongalDates: Record<number, [number, number]> = {
      2024: [0, 15],
      2025: [0, 14],
      2026: [0, 14],
      2027: [0, 15],
      2028: [0, 15]
    };
    const diwaliDates: Record<number, [number, number]> = {
      2024: [9, 31],
      2025: [9, 20],
      2026: [10, 8],
      2027: [9, 29],
      2028: [9, 17]
    };

    if (pongalDates[year]) {
      const [month, day] = pongalDates[year];
      addHoliday(new Date(year, month, day), 'Pongal');
    }

    if (diwaliDates[year]) {
      const [month, day] = diwaliDates[year];
      addHoliday(new Date(year, month, day), 'Diwali');
    }

    // 연도별 주요 인도 축제/명절 (변동일)
    addYearHoliday(2024, 2, 8, 'Maha Shivaratri');
    addYearHoliday(2024, 2, 25, 'Holi');
    addYearHoliday(2024, 3, 11, 'Eid-ul-Fitr');
    addYearHoliday(2024, 3, 17, 'Ram Navami');
    addYearHoliday(2024, 3, 21, 'Mahavir Jayanti');
    addYearHoliday(2024, 4, 23, 'Buddha Purnima');
    addYearHoliday(2024, 5, 17, 'Eid-ul-Adha');
    addYearHoliday(2024, 6, 17, 'Muharram');
    addYearHoliday(2024, 7, 19, 'Raksha Bandhan');
    addYearHoliday(2024, 7, 26, 'Janmashtami');
    addYearHoliday(2024, 8, 7, 'Ganesh Chaturthi');
    addYearHoliday(2024, 8, 15, 'Onam');
    addYearHoliday(2024, 8, 16, 'Milad-un-Nabi');
    addYearHoliday(2024, 9, 12, 'Dussehra');
    addYearHoliday(2024, 10, 7, 'Chhath Puja');
    addYearHoliday(2024, 10, 15, 'Guru Nanak Jayanti');

    addYearHoliday(2025, 1, 26, 'Maha Shivaratri');
    addYearHoliday(2025, 2, 14, 'Holi');
    addYearHoliday(2025, 2, 31, 'Eid-ul-Fitr');
    addYearHoliday(2025, 3, 10, 'Mahavir Jayanti');
    addYearHoliday(2025, 4, 12, 'Buddha Purnima');
    addYearHoliday(2025, 5, 7, 'Eid-ul-Adha');
    addYearHoliday(2025, 6, 6, 'Muharram');
    addYearHoliday(2025, 7, 9, 'Raksha Bandhan');
    addYearHoliday(2025, 7, 16, 'Janmashtami');
    addYearHoliday(2025, 7, 27, 'Ganesh Chaturthi');
    addYearHoliday(2025, 8, 5, 'Onam');
    addYearHoliday(2025, 8, 5, 'Milad-un-Nabi');
    addYearHoliday(2025, 9, 2, 'Dussehra');
    addYearHoliday(2025, 9, 28, 'Chhath Puja');
    addYearHoliday(2025, 10, 5, 'Guru Nanak Jayanti');

    addYearHoliday(2026, 1, 15, 'Maha Shivaratri');
    addYearHoliday(2026, 2, 4, 'Holi');
    addYearHoliday(2026, 2, 21, 'Eid-ul-Fitr');
    addYearHoliday(2026, 2, 26, 'Ram Navami');
    addYearHoliday(2026, 3, 2, 'Mahavir Jayanti');
    addYearHoliday(2026, 4, 1, 'Buddha Purnima');
    addYearHoliday(2026, 4, 27, 'Eid-ul-Adha');
    addYearHoliday(2026, 5, 26, 'Muharram');
    addYearHoliday(2026, 7, 28, 'Raksha Bandhan');
    addYearHoliday(2026, 8, 4, 'Janmashtami');
    addYearHoliday(2026, 8, 14, 'Ganesh Chaturthi');
    addYearHoliday(2026, 7, 26, 'Onam');
    addYearHoliday(2026, 7, 25, 'Milad-un-Nabi');
    addYearHoliday(2026, 9, 20, 'Dussehra');
    addYearHoliday(2026, 10, 17, 'Chhath Puja');
    addYearHoliday(2026, 10, 24, 'Guru Nanak Jayanti');

    addYearHoliday(2027, 2, 24, 'Holi');
    addYearHoliday(2027, 2, 11, 'Eid-ul-Fitr');
    addYearHoliday(2027, 3, 15, 'Ram Navami');
    addYearHoliday(2027, 3, 18, 'Mahavir Jayanti');
    addYearHoliday(2027, 4, 20, 'Buddha Purnima');
    addYearHoliday(2027, 5, 17, 'Eid-ul-Adha');
    addYearHoliday(2027, 6, 16, 'Muharram');
    addYearHoliday(2027, 7, 18, 'Raksha Bandhan');
    addYearHoliday(2027, 7, 25, 'Janmashtami');
    addYearHoliday(2027, 8, 4, 'Ganesh Chaturthi');
    addYearHoliday(2027, 8, 15, 'Onam');
    addYearHoliday(2027, 8, 15, 'Milad-un-Nabi');
    addYearHoliday(2027, 9, 10, 'Dussehra');
    addYearHoliday(2027, 10, 6, 'Chhath Puja');
    addYearHoliday(2027, 10, 14, 'Guru Nanak Jayanti');

    addYearHoliday(2028, 2, 13, 'Holi');
    addYearHoliday(2028, 1, 29, 'Maha Shivaratri');
    addYearHoliday(2028, 2, 1, 'Eid-ul-Fitr');
    addYearHoliday(2028, 3, 3, 'Ram Navami');
    addYearHoliday(2028, 3, 7, 'Mahavir Jayanti');
    addYearHoliday(2028, 4, 9, 'Buddha Purnima');
    addYearHoliday(2028, 4, 6, 'Eid-ul-Adha');
    addYearHoliday(2028, 5, 5, 'Muharram');
    addYearHoliday(2028, 7, 7, 'Raksha Bandhan');
    addYearHoliday(2028, 7, 13, 'Janmashtami');
    addYearHoliday(2028, 7, 23, 'Ganesh Chaturthi');
    addYearHoliday(2028, 8, 2, 'Onam');
    addYearHoliday(2028, 8, 4, 'Milad-un-Nabi');
    addYearHoliday(2028, 8, 29, 'Dussehra');
    addYearHoliday(2028, 9, 26, 'Chhath Puja');
    addYearHoliday(2028, 10, 2, 'Guru Nanak Jayanti');

    return holidayMap;
  };

  const getHolidayNames = (date: Date): string[] => {
    const holidayMap = getIndianHolidayMap(date.getFullYear());
    return holidayMap[toDateKey(date)] || [];
  };

  const getHolidayDisplayName = (name: string): string => {
    const holidayNameMap: Record<string, { ko: string; en: string }> = {
      'New Year': { ko: '신정', en: 'New Year' },
      'Republic Day': { ko: '공화국의 날', en: 'Republic Day' },
      'Makar Sankranti': { ko: '마카르 산크란티', en: 'Makar Sankranti' },
      'Pongal': { ko: '퐁갈', en: 'Pongal' },
      'Labour Day': { ko: '노동절', en: 'Labour Day' },
      'Independence Day': { ko: '독립기념일', en: 'Independence Day' },
      'Gandhi Jayanti': { ko: '간디 탄생일', en: 'Gandhi Jayanti' },
      'Dr. Ambedkar Jayanti': { ko: '암베드카르 탄생일', en: 'Dr. Ambedkar Jayanti' },
      'Christmas': { ko: '크리스마스', en: 'Christmas' },
      'Good Friday': { ko: '성금요일', en: 'Good Friday' },
      'Diwali': { ko: '디왈리', en: 'Diwali' },
      'Maha Shivaratri': { ko: '마하 시바라트리', en: 'Maha Shivaratri' },
      'Holi': { ko: '홀리', en: 'Holi' },
      'Eid-ul-Fitr': { ko: '이드 알피트르', en: 'Eid-ul-Fitr' },
      'Ram Navami': { ko: '라마 나바미', en: 'Ram Navami' },
      'Mahavir Jayanti': { ko: '마하비르 자얀티', en: 'Mahavir Jayanti' },
      'Buddha Purnima': { ko: '부처님 오신 날', en: 'Buddha Purnima' },
      'Eid-ul-Adha': { ko: '이드 알아드하', en: 'Eid-ul-Adha' },
      'Muharram': { ko: '무하람', en: 'Muharram' },
      'Raksha Bandhan': { ko: '락샤 반단', en: 'Raksha Bandhan' },
      'Janmashtami': { ko: '잔마슈타미', en: 'Janmashtami' },
      'Ganesh Chaturthi': { ko: '가네쉬 차투르티', en: 'Ganesh Chaturthi' },
      'Onam': { ko: '오남', en: 'Onam' },
      'Milad-un-Nabi': { ko: '밀라드 운 나비', en: 'Milad-un-Nabi' },
      'Dussehra': { ko: '두세라', en: 'Dussehra' },
      'Chhath Puja': { ko: '차트 푸자', en: 'Chhath Puja' },
      'Guru Nanak Jayanti': { ko: '구루 나낙 탄생일', en: 'Guru Nanak Jayanti' }
    };

    const mapped = holidayNameMap[name];
    if (!mapped) return name;
    return isEn ? mapped.en : `${mapped.ko} (${mapped.en})`;
  };

  const isHoliday = (date: Date): boolean => getHolidayNames(date).length > 0;

  const getComplianceLabels = (date: Date): Array<{ id: string; label: string; color: string }> => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const labels: string[] = [];

    // 월별 신고
    if (day === 7) labels.push('TDS');
    if (day === 11) labels.push('GST-R1');
    if (day === 20) labels.push('GST-3B');
    if (day === 15) labels.push('PF');
    if (day === 15) labels.push('ESI');
    if (day === 20) labels.push('Professional Tax');
    if (day === 7) labels.push('ECB');

    // 분기별 신고
    if ([3, 6, 9, 12].includes(month) && day === 15) labels.push('Advance Tax');
    if ([7, 10, 1, 5].includes(month) && day === 31) labels.push('TDS Return');
    if ([4, 7, 10, 1].includes(month) && day === 13) labels.push('GST-R1 (Quarterly)');
    if ([4, 7, 10, 1].includes(month) && day === 22) labels.push('GST-3B (Quarterly)');
    if ([1, 4, 7, 10].includes(month) && day === 1) labels.push('Board Meeting');

    // 연도별 신고
    if (month === 9 && day === 30) labels.push('DIR-3 KYC');
    if (month === 4 && day === 30) labels.push('Professional Tax Annual Return');
    if (month === 5 && day === 30) labels.push('SFT');
    if (month === 7 && day === 20) labels.push('FLA');
    if (month === 9 && day === 30) labels.push('Audit of Financial Statement');
    if (month === 9 && day === 30) labels.push('ITR');
    if (month === 10 && day === 30) labels.push('ROC AOC-4/MGT-7');
    if (month === 11 && day === 30) labels.push('Transfer Pricing Audit Report');
    if (month === 12 && day === 31) labels.push('GST-9/GST Audit');

    return labels.map((label) => ({
      id: `compliance-${month}-${day}-${label}`,
      label,
      color: 'info.main'
    }));
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6; // 일요일 또는 토요일
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 해당 월의 첫 번째 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 첫 번째 날의 요일 (0 = 일요일)
    const startDay = firstDay.getDay();
    
    // 달력에 표시할 날짜 배열
    const days: (Date | null)[] = [];
    
    // 이전 달의 마지막 날들 (빈 칸 채우기)
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthLastDay - i));
    }
    
    // 현재 달의 날짜들
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    // 다음 달의 첫 날들 (빈 칸 채우기, 총 42개 셀)
    const remainingCells = 42 - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      days.push(new Date(year, month + 1, day));
    }
    
    const weekDays = isEn ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['일', '월', '화', '수', '목', '금', '토'];
    
    const cellBorder = alpha(theme.palette.divider, 0.65);
    const mutedOtherMonth = alpha(theme.palette.grey[500], 0.1);

    return (
      <Box
        sx={{
          width: '100%',
          maxWidth: '100%',
          maxHeight: { xs: 'calc(100vh - 200px)', sm: 'calc(100vh - 220px)' },
          overflowY: 'auto',
          pr: { xs: 0.5, sm: 1 },
          boxSizing: 'border-box',
        }}
      >
        {/* 요일 헤더 */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 0.75,
            mb: 1.25,
            px: 0.25,
          }}
        >
          {weekDays.map((day, index) => (
            <Box
              key={day}
              sx={{
                textAlign: 'center',
                py: 1,
                borderRadius: '10px',
                bgcolor: alpha(theme.palette.grey[500], 0.06),
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontSize: ycsRem(0.72),
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  color:
                    index === 0 || index === 6
                      ? alpha(theme.palette.error.main, 0.92)
                      : alpha(theme.palette.text.primary, 0.72),
                }}
              >
                {day}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* 달력 그리드 */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 0.75,
            px: 0.25,
          }}
        >
          {days.map((date, index) => {
            if (!date) return null;

            const isCurrentMonth = date.getMonth() === month;
            const isHolidayDate = isHoliday(date);
            const holidayNames = getHolidayNames(date);
            const isTodayDate = isToday(date);
            const isWeekendDate = isWeekend(date);
            const dateKey = toDateKey(date);
            const customLabels = customSchedules[dateKey] || [];
            const complianceLabels = getComplianceLabels(date);
            const hasCompanyHoliday = customLabels.some((item) => item.type === 'company_holiday');

            const isWeekendOnly = isWeekendDate && !isHolidayDate;

            const cellBg = isTodayDate
              ? theme.palette.primary.main
              : isHolidayDate
                ? alpha(theme.palette.error.main, 0.1)
                : isWeekendOnly
                  ? alpha(theme.palette.primary.main, 0.07)
                  : !isCurrentMonth
                    ? mutedOtherMonth
                    : theme.palette.background.paper;

            const cellFg = !isCurrentMonth
              ? alpha(theme.palette.text.primary, 0.38)
              : isTodayDate
                ? theme.palette.primary.contrastText
                : isHolidayDate
                  ? alpha(theme.palette.error.main, 0.95)
                  : isWeekendDate
                    ? alpha(theme.palette.error.main, 0.85)
                    : theme.palette.text.primary;

            return (
              <Box key={index} sx={{ minWidth: 0, boxSizing: 'border-box' }}>
                <Box
                  sx={{
                    aspectRatio: '3 / 2',
                    border: `1px solid ${cellBorder}`,
                    borderRadius: '12px',
                    p: ycsSp(0.4),
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    bgcolor: cellBg,
                    color: cellFg,
                    cursor: 'pointer',
                    boxShadow: isTodayDate ? `0 2px 12px ${alpha(theme.palette.primary.main, 0.35)}` : 'none',
                    transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                      bgcolor: isTodayDate
                        ? theme.palette.primary.dark
                        : isHolidayDate
                          ? alpha(theme.palette.error.main, 0.16)
                          : isWeekendOnly
                            ? alpha(theme.palette.primary.main, 0.12)
                            : alpha(theme.palette.grey[500], 0.08),
                      color: isTodayDate ? theme.palette.primary.contrastText : theme.palette.text.primary,
                      boxShadow: isTodayDate ? `0 4px 16px ${alpha(theme.palette.primary.main, 0.4)}` : undefined,
                    },
                  }}
                  onClick={() => openScheduleDialog(date)}
                >
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: ycsSp(0.25) }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: hasCompanyHoliday ? 700 : isTodayDate || isHolidayDate ? 600 : 500,
                        fontSize: ycsRem(0.78),
                        letterSpacing: '-0.02em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: hasCompanyHoliday ? Math.round(22 * YEARLY_CALENDAR_SCALE) : 'auto',
                        height: hasCompanyHoliday ? Math.round(22 * YEARLY_CALENDAR_SCALE) : 'auto',
                        px: hasCompanyHoliday ? ycsSp(0.4) : 0,
                        borderRadius: hasCompanyHoliday ? '50%' : 0,
                        border: hasCompanyHoliday ? `${Math.round(2 * YEARLY_CALENDAR_SCALE)}px solid` : 'none',
                        borderColor: hasCompanyHoliday ? (isTodayDate ? alpha('#fff', 0.85) : 'warning.dark') : 'transparent',
                        bgcolor: hasCompanyHoliday && !isTodayDate ? alpha(theme.palette.warning.main, 0.95) : 'transparent',
                        color: hasCompanyHoliday && !isTodayDate
                          ? theme.palette.common.white
                          : isTodayDate && !hasCompanyHoliday
                            ? theme.palette.primary.contrastText
                            : undefined,
                        lineHeight: 1,
                      }}
                    >
                      {date.getDate()}
                    </Typography>
                    {hasCompanyHoliday && (
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: ycsSp(0.1) }}>
                        <CompanyHolidayStarIcon color={isTodayDate ? '#FFFFFF' : '#FF1744'} />
                        <CompanyHolidayStarIcon color={isTodayDate ? '#FFFFFF' : '#FF1744'} />
                      </Box>
                    )}
                  </Box>
                  {holidayNames.length > 0 && (
                    <Box sx={{ mt: ycsSp(0.15), display: 'flex', flexDirection: 'column', gap: ycsSp(0.1) }}>
                      {holidayNames.slice(0, 2).map((name) => (
                        <Typography
                          key={`${dateKey}-${name}`}
                          variant="caption"
                          sx={{
                            fontSize: ycsRem(0.58),
                            color: isTodayDate ? alpha('#fff', 0.95) : alpha(theme.palette.error.main, 0.92),
                            fontWeight: 600,
                            lineHeight: 1.25,
                            letterSpacing: '0.01em',
                          }}
                        >
                          {getHolidayDisplayName(name)}
                        </Typography>
                      ))}
                      {holidayNames.length > 2 && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: ycsRem(0.56),
                            color: isTodayDate ? alpha('#fff', 0.95) : alpha(theme.palette.error.main, 0.92),
                            fontWeight: 600,
                            lineHeight: 1.25,
                          }}
                        >
                          +{holidayNames.length - 2}
                        </Typography>
                      )}
                    </Box>
                  )}
                  {customLabels.length > 0 && (
                    <Box sx={{ mt: ycsSp(0.3), display: 'flex', flexDirection: 'column', gap: ycsSp(0.2) }}>
                      {customLabels.slice(0, 2).map((item) => (
                        <Typography
                          key={`${dateKey}-${item.id}`}
                          variant="caption"
                          sx={{
                            fontSize: item.type === 'company_holiday' ? ycsRem(0.66) : ycsRem(0.6),
                            color: isTodayDate
                              ? 'white'
                              : item.type === 'company_holiday'
                                ? 'common.white'
                                : 'primary.main',
                            fontWeight: 600,
                            lineHeight: 1.2,
                            letterSpacing: '0.01em',
                            bgcolor:
                              item.type === 'company_holiday'
                                ? isTodayDate
                                  ? alpha('#fff', 0.22)
                                  : alpha(theme.palette.warning.dark, 0.92)
                                : 'transparent',
                            px: item.type === 'company_holiday' ? ycsSp(0.35) : 0,
                            borderRadius: item.type === 'company_holiday' ? '8px' : 0,
                            display: 'inline-flex',
                            alignSelf: 'flex-start'
                          }}
                        >
                          {item.title || txt('회사 휴일', 'Company Holiday')}
                        </Typography>
                      ))}
                      {customLabels.length > 2 && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: ycsRem(0.6),
                            color: isTodayDate ? alpha('#fff', 0.95) : alpha(theme.palette.primary.main, 0.9),
                            fontWeight: 600,
                          }}
                        >
                          +{customLabels.length - 2}
                        </Typography>
                      )}
                    </Box>
                  )}
                  {complianceLabels.length > 0 && (
                    <Box sx={{ mt: ycsSp(0.2), display: 'flex', flexDirection: 'column', gap: ycsSp(0.1) }}>
                      {complianceLabels.slice(0, 2).map((item) => (
                        <Typography
                          key={`${dateKey}-${item.id}`}
                          variant="caption"
                          sx={{
                            fontSize: ycsRem(0.56),
                            color: item.color,
                            fontWeight: 600,
                            lineHeight: 1.2,
                            letterSpacing: '0.01em',
                          }}
                        >
                          {item.label}
                        </Typography>
                      ))}
                      {complianceLabels.length > 2 && (
                        <Typography variant="caption" sx={{ fontSize: ycsRem(0.56), color: 'info.main', fontWeight: 600 }}>
                          +{complianceLabels.length - 2}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  if ((viewMode === 'view' || viewMode === 'edit') && selectedNotice) {
    return (
      <Box sx={{ ...mvsPageRootSx }}>
        <MvsPageHeader
          title={<>공지사항 상세{isEn ? ' Notice Detail' : ''}</>}
          actions={
            <Button
              variant="outlined"
              onClick={() => {
                setViewMode('list');
                setIsEditing(false);
              }}
            >
              {txt('목록으로', 'Back to List')}
            </Button>
          }
        />

        <Card>
          <CardContent>
            {isEditing ? (
              // 수정 모드
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 500 }}>
                    제목 *
                  </Typography>
                  <TextField
                    fullWidth
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    size="small"
                    placeholder="제목을 입력하세요"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        bgcolor: 'background.paper',
                      }
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 500 }}>
                      대상 *
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={formData.targetAudience}
                        onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as any })}
                        sx={{
                          borderRadius: 1.5,
                          bgcolor: 'background.paper',
                        }}
                      >
                        <MenuItem value="all">전체</MenuItem>
                        <MenuItem value="employees">직원</MenuItem>
                        <MenuItem value="managers">관리자</MenuItem>
                        <MenuItem value="specific">특정 대상</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', pt: 3 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.isPinned}
                          onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                          color="primary"
                        />
                      }
                      label="고정하기"
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 500 }}>
                    내용 *
                  </Typography>
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: 'background.paper',
                      '& .ProseMirror': {
                        minHeight: '300px',
                        padding: 2,
                        outline: 'none',
                        '& p.is-editor-empty:first-child::before': {
                          content: '"내용을 입력하세요..."',
                          float: 'left',
                          color: '#adb5bd',
                          pointerEvents: 'none',
                          height: 0
                        },
                        '& img': {
                          maxWidth: '100%',
                          height: 'auto',
                          display: 'block',
                          margin: '12px auto',
                          cursor: 'pointer'
                        },
                        '& table': {
                          borderCollapse: 'collapse',
                          width: '100%',
                          margin: '16px 0',
                          '& td, & th': {
                            border: '1px solid #ddd',
                            padding: '8px',
                            textAlign: 'left'
                          },
                          '& th': {
                            backgroundColor: '#f2f2f2',
                            fontWeight: 'bold'
                          }
                        },
                        '& [style*="font-size"]': {
                          // fontSize 스타일 지원
                        },
                        '& span[style*="font-size"]': {
                          // span 태그의 fontSize 스타일 지원
                        },
                        '& p[style*="font-size"]': {
                          // p 태그의 fontSize 스타일 지원
                        }
                      }
                    }}
                  >
                    {/* 툴바 */}
                    {editor && (
                      <Box sx={{
                        borderBottom: '1px solid',
                        borderColor: 'grey.300',
                        bgcolor: 'grey.50',
                        p: 1,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5
                      }}>
                        <Button
                          size="small"
                          variant={editor.isActive('bold') ? 'contained' : 'text'}
                          onClick={() => editor.chain().focus().toggleBold().run()}
                          sx={{ minWidth: 'auto', px: 1 }}
                        >
                          <strong>B</strong>
                        </Button>
                        <Button
                          size="small"
                          variant={editor.isActive('italic') ? 'contained' : 'text'}
                          onClick={() => editor.chain().focus().toggleItalic().run()}
                          sx={{ minWidth: 'auto', px: 1 }}
                        >
                          <em>I</em>
                        </Button>
                        <Button
                          size="small"
                          variant={editor.isActive('underline') ? 'contained' : 'text'}
                          onClick={() => editor.chain().focus().toggleUnderline().run()}
                          sx={{ minWidth: 'auto', px: 1 }}
                        >
                          <u>U</u>
                        </Button>
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                          <Select
                            value={editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === 'p') {
                                editor.chain().focus().setParagraph().run();
                              } else {
                                editor.chain().focus().toggleHeading({ level: parseInt(value.replace('h', '')) as 1 | 2 | 3 }).run();
                              }
                            }}
                            sx={{ height: 32 }}
                          >
                            <MenuItem value="p">본문</MenuItem>
                            <MenuItem value="h1">제목1</MenuItem>
                            <MenuItem value="h2">제목2</MenuItem>
                            <MenuItem value="h3">제목3</MenuItem>
                          </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 80 }}>
                          <Select
                            value="14px"
                            onChange={(e) => {
                              const fontSize = e.target.value;
                              // 현재 선택된 텍스트가 있으면 해당 텍스트에 적용, 없으면 다음 입력에 적용
                              editor.chain().focus().setMark('textStyle', { fontSize }).run();
                            }}
                            sx={{ height: 32 }}
                          >
                            <MenuItem value="12px">12px</MenuItem>
                            <MenuItem value="14px">14px</MenuItem>
                            <MenuItem value="16px">16px</MenuItem>
                            <MenuItem value="18px">18px</MenuItem>
                            <MenuItem value="24px">24px</MenuItem>
                          </Select>
                        </FormControl>
                        <Tooltip title="텍스트 색상">
                          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                            <IconButton
                              size="small"
                              sx={{
                                minWidth: 'auto',
                                px: 1,
                                position: 'relative'
                              }}
                            >
                              <FormatColorTextIcon fontSize="small" />
                            </IconButton>
                            <input
                              type="color"
                              value={editor.getAttributes('textStyle').color || '#000000'}
                              onChange={(e) => {
                                editor.chain().focus().setColor(e.target.value).run();
                              }}
                              style={{
                                position: 'absolute',
                                opacity: 0,
                                width: '100%',
                                height: '100%',
                                cursor: 'pointer',
                                top: 0,
                                left: 0
                              }}
                            />
                          </Box>
                        </Tooltip>
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                        <Tooltip title="왼쪽 정렬">
                          <IconButton
                            size="small"
                            color={editor.isActive({ textAlign: 'left' }) ? 'primary' : 'default'}
                            onClick={() => editor.chain().focus().setTextAlign('left').run()}
                          >
                            <FormatAlignLeftIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="가운데 정렬">
                          <IconButton
                            size="small"
                            color={editor.isActive({ textAlign: 'center' }) ? 'primary' : 'default'}
                            onClick={() => editor.chain().focus().setTextAlign('center').run()}
                          >
                            <FormatAlignCenterIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="오른쪽 정렬">
                          <IconButton
                            size="small"
                            color={editor.isActive({ textAlign: 'right' }) ? 'primary' : 'default'}
                            onClick={() => editor.chain().focus().setTextAlign('right').run()}
                          >
                            <FormatAlignRightIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                        <Tooltip title="이미지 삽입">
                          <IconButton
                            size="small"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.setAttribute('type', 'file');
                              input.setAttribute('accept', 'image/*');
                              input.click();
                              input.onchange = () => {
                                const file = input.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (e) => {
                                    const result = e.target?.result as string;
                                    if (result) {
                                      editor.chain()
                                        .focus()
                                        .setImage({ src: result })
                                        .run();
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              };
                            }}
                          >
                            <ImageIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="표 삽입">
                          <IconButton
                            size="small"
                            onClick={() => setTableDialogOpen(true)}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="파일 첨부">
                          <IconButton
                            size="small"
                            component="label"
                          >
                            <AttachFileIcon fontSize="small" />
                            <input
                              type="file"
                              hidden
                              multiple
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                const fileNames = files.map(f => f.name);
                                setAttachedFiles([...attachedFiles, ...files]);
                                // formData의 attachments에도 파일명 추가
                                setFormData({
                                  ...formData,
                                  attachments: [...formData.attachments, ...fileNames]
                                });
                              }}
                            />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                    {/* 에디터 */}
                    <EditorContent editor={editor} />
                  </Box>
                  {(attachedFiles.length > 0 || formData.attachments.length > 0) && (
                    <Box sx={{ mt: 1 }}>
                      {attachedFiles.map((file, index) => (
                        <Chip
                          key={`file-${index}`}
                          label={file.name}
                          onDelete={() => {
                            const newFiles = attachedFiles.filter((_, i) => i !== index);
                            setAttachedFiles(newFiles);
                            // formData에서도 제거
                            const fileNames = newFiles.map(f => f.name);
                            setFormData({ ...formData, attachments: fileNames });
                          }}
                          sx={{ mr: 1, mb: 1 }}
                          size="small"
                        />
                      ))}
                      {formData.attachments.filter(name => !attachedFiles.some(f => f.name === name)).map((fileName, index) => (
                        <Chip
                          key={`attachment-${index}`}
                          label={fileName}
                          onDelete={() => {
                            setFormData({
                              ...formData,
                              attachments: formData.attachments.filter((_, i) => i !== index)
                            });
                          }}
                          sx={{ mr: 1, mb: 1 }}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            ) : (
              // 보기 모드
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h4" fontWeight="bold" gutterBottom>
                    {stripHtmlTags(selectedNotice.title)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    {getStatusChip(selectedNotice.status)}
                    {(selectedNotice as any).isPinned && (
                      <Chip label="고정" color="warning" size="small" icon={<PriorityIcon />} />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    대상: {getTargetAudienceLabel(selectedNotice.targetAudience)} • 
                    작성자: {selectedNotice.author} • 
                    작성일: {selectedNotice.createdAt}
                    {selectedNotice.publishedAt && ` • 게시일: ${selectedNotice.publishedAt}`}
                  </Typography>
                  {isNoticeAuthor(selectedNotice) && !noticeMenuFlags.canEdit && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      {isEn
                        ? 'You wrote this notice, but your account does not have the notice menu “Edit” permission. Enable Edit (or ask an admin) in Menu Permission Management — “Register” alone does not allow editing.'
                        : '본인이 작성한 공지이지만, 메뉴 권한에 공지사항「수정」이 없습니다. 메뉴권한관리에서 해당 사용자에 수정을 허용해 주세요. 「등록」만으로는 수정할 수 없습니다.'}
                    </Alert>
                  )}
                </Box>

                <Divider sx={{ my: 3 }} />

                <Box 
                  sx={{ 
                    mb: 3,
                    '& p': {
                      margin: '0.5em 0',
                      lineHeight: 1.8
                    },
                    '& img': {
                      maxWidth: '100%',
                      height: 'auto',
                      display: 'block',
                      margin: '12px auto'
                    },
                    '& table': {
                      borderCollapse: 'collapse',
                      width: '100%',
                      margin: '16px 0',
                      '& td, & th': {
                        border: '1px solid #ddd',
                        padding: '8px',
                        textAlign: 'left'
                      },
                      '& th': {
                        backgroundColor: '#f2f2f2',
                        fontWeight: 'bold'
                      }
                    },
                    '& h1, & h2, & h3': {
                      margin: '0.8em 0 0.4em 0',
                      fontWeight: 'bold'
                    },
                    '& ul, & ol': {
                      paddingLeft: '1.5em',
                      margin: '0.5em 0'
                    }
                  }}
                  dangerouslySetInnerHTML={{ __html: selectedNotice.content }}
                />
              </>
            )}

            {selectedNotice.attachments && selectedNotice.attachments.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>첨부파일</Typography>
                <List>
                  {selectedNotice.attachments.map((attachment, index) => (
                    <ListItem 
                      key={index}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.hover'
                        }
                      }}
                      onClick={() => {
                        // 첨부파일 다운로드 또는 열기
                        // 실제 파일 URL이 있다면 여기서 처리
                                              }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <AttachFileIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={attachment}
                        secondary="클릭하여 다운로드"
                      />
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          // 다운로드 로직
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
              {!isEditing && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    조회수: {selectedNotice.views}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    읽음: {selectedNotice.readCount}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 1 }}>
                {isEditing ? (
                  <>
                    <Button
                      variant="outlined"
                      onClick={handleCancelEdit}
                    >
                      취소
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleSaveEdit}
                    >
                      저장
                    </Button>
                  </>
                ) : (
                  canUserEditNotice(selectedNotice) && (
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => handleEditNotice(selectedNotice)}
                    >
                      수정
                    </Button>
                  )
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const listStateBoxSx = {
    ...mvsBodyListTableSx,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    py: { xs: 6, sm: 8 },
    px: 3,
    gap: 1.5,
  } as const;

  const cellEllipsisSx = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 0,
  } as const;

  const noticeTableSx = {
    width: '100%',
    tableLayout: 'fixed',
    borderCollapse: 'collapse',
    bgcolor: 'transparent',
    '& .MuiTableCell-root': {
      borderLeft: 'none',
      borderRight: 'none',
      borderTop: 'none',
    },
  } as const;

  const filterFieldSx = { ...mvsSearchFieldSx, ...mvsFilterFieldHeightSx };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPage(1);
  };

  return (
    <Box sx={mvsPageRootSx}>
      <MvsPageHeader
        title={<>공지사항{isEn ? ' Notice Board' : ''}</>}
        description={txt('중요한 공지사항과 업무 관련 정보를 확인하는 페이지입니다.', 'This page shows important notices and work-related updates.')}
      />

      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            px: { xs: 0.5, sm: 1 },
            minHeight: 48,
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              bgcolor: 'primary.main',
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              letterSpacing: '0.01em',
              minHeight: 48,
              py: 1.5,
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main',
              },
            },
          }}
        >
          <Tab label={txt('공지사항', 'Notices')} disabled={noticeMenuFlags.menusLoading || !noticeMenuFlags.canRead} />
          <Tab
            label={txt('연간 스케줄표', 'Yearly Schedule')}
            disabled={noticeMenuFlags.menusLoading || !noticeMenuFlags.canRead}
          />
        </Tabs>
      </Card>

      {!noticeMenuFlags.menusLoading && !noticeMenuFlags.canRead && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('common.menuNoView')}
        </Alert>
      )}

      {/* 탭별 컨텐츠 */}
      {activeTab === 0 && (
        <>
      {/* 필터 및 검색 */}
      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 0 }}>
        <Box sx={mvsBodyFilterWrapSx}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'minmax(0, 2fr) minmax(0, 1fr) auto auto',
              },
              gap: 2,
              alignItems: 'flex-end',
            }}
          >
            <TextField
              fullWidth
              size="small"
              label={txt('검색', 'Search')}
              placeholder={txt('제목, 내용, 작성자 검색', 'Search title, content, author')}
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              disabled={noticeMenuFlags.menusLoading || !noticeMenuFlags.canRead}
              sx={filterFieldSx}
              {...mvsOutlinedLabelProps}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', opacity: 0.85, fontSize: '1.125rem' }} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl
              fullWidth
              size="small"
              disabled={noticeMenuFlags.menusLoading || !noticeMenuFlags.canRead}
              sx={filterFieldSx}
            >
              <InputLabel shrink>{txt('상태', 'Status')}</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(String(e.target.value))}
                label={txt('상태', 'Status')}
              >
                <MenuItem value="">{txt('전체', 'All')}</MenuItem>
                <MenuItem value="published">{txt('게시됨', 'Published')}</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<ResetIcon fontSize="small" />}
              onClick={handleResetFilters}
              disabled={noticeMenuFlags.menusLoading || !noticeMenuFlags.canRead}
              sx={{ ...mvsBodyOutlinedBtnSx, height: 40, whiteSpace: 'nowrap' }}
            >
              {t('common.reset')}
            </Button>
            <Tooltip title={t('common.menuNoCreate')} disableHoverListener={noticeMenuFlags.menusLoading || noticeMenuFlags.canCreate}>
              <span style={{ display: 'block' }}>
                <Button
                  variant="contained"
                  disableElevation
                  startIcon={<AddIcon fontSize="small" />}
                  onClick={handleOpenCreateDialog}
                  disabled={noticeMenuFlags.menusLoading || !noticeMenuFlags.canCreate}
                  sx={{ ...mvsBodyPrimaryBtnSx, height: 40, whiteSpace: 'nowrap' }}
                >
                  {txt('새 공지사항', 'New Notice')}
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Card>

          {/* 공지사항 목록 */}
          <Box sx={mvsBodyListZoneSx}>
              {loading ? (
                <Box sx={listStateBoxSx}>
                  <CircularProgress size={36} />
                  <Typography variant="body2" color="text.secondary">
                    {t('common.loading')}
                  </Typography>
                </Box>
              ) : notices.length === 0 ? (
                <Box sx={listStateBoxSx}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em', color: 'text.primary' }}>
                    {txt('공지사항이 없습니다.', 'No notices found.')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
                    {searchTerm || statusFilter
                      ? txt('검색 조건에 맞는 공지가 없습니다. 필터를 초기화해 보세요.', 'No notices match your filters. Try resetting.')
                      : txt('새 공지사항을 등록해 보세요.', 'Create a new notice to get started.')}
                  </Typography>
                  {!searchTerm && !statusFilter && (
                    <Button
                      variant="contained"
                      disableElevation
                      startIcon={<AddIcon fontSize="small" />}
                      onClick={handleOpenCreateDialog}
                      disabled={noticeMenuFlags.menusLoading || !noticeMenuFlags.canCreate}
                      sx={mvsBodyPrimaryBtnSx}
                    >
                      {txt('새 공지사항', 'New Notice')}
                    </Button>
                  )}
                </Box>
              ) : (
                <>
                <TableContainer sx={{ ...mvsBodyListTableSx, ...mvsTableScrollSx }}>
                  <Table size="small" sx={noticeTableSx}>
                    <TableHead sx={mvsTableHeadHighlightSx}>
                      <TableRow>
                        <TableCell width="42%">{txt('제목', 'Title')}</TableCell>
                        <TableCell width="22%">{txt('작성자', 'Author')}</TableCell>
                        <TableCell width="16%">{txt('발행일', 'Published Date')}</TableCell>
                        <TableCell width="10%">{txt('조회수', 'Views')}</TableCell>
                        <TableCell width="10%" align="right">{txt('작업', 'Action')}</TableCell>
                      </TableRow>
                    </TableHead>
            <TableBody sx={mvsTableBodyRowSx}>
              {[...notices].sort((a, b) => {
                const aPinned = (a as any).isPinned ? 1 : 0;
                const bPinned = (b as any).isPinned ? 1 : 0;
                return bPinned - aPinned;
              }).map((notice) => (
                <TableRow 
                  key={notice.id} 
                  hover
                  onClick={() => handleViewNotice(notice)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={cellEllipsisSx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        {(notice as any).isPinned && (
                          <Chip 
                            label={txt('고정', 'Pinned')} 
                            color="warning" 
                            size="small" 
                            icon={<PushPinIcon sx={{ fontSize: '0.875rem' }} />}
                            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, flexShrink: 0 }}
                          />
                        )}
                        {notice.priority === 'urgent' && (
                          <WarningIcon sx={{ fontSize: 18, color: 'error.main', flexShrink: 0 }} />
                        )}
                        <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ minWidth: 0 }}>
                          {stripHtmlTags(notice.title)}
                        </Typography>
                        {notice.attachments && notice.attachments.length > 0 && (
                          <Tooltip title={txt(`첨부파일 ${notice.attachments.length}개`, `${notice.attachments.length} attachment(s)`)}>
                            <AttachFileIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                          </Tooltip>
                        )}
                    </Box>
                  </TableCell>
                  <TableCell sx={cellEllipsisSx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem', flexShrink: 0 }}>
                        {notice.author.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" noWrap>{notice.author}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={cellEllipsisSx}>
                    <Typography variant="body2" noWrap>
                      {notice.publishedAt
                        ? new Date(notice.publishedAt).toLocaleDateString(
                            isEn ? 'en-US' : 'ko-KR',
                            { year: 'numeric', month: '2-digit', day: '2-digit' }
                          )
                        : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={cellEllipsisSx}>
                    <Typography variant="body2" noWrap>
                      {isEn ? `${notice.views}` : `${notice.views}회`}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Tooltip title={noticeMenuFlags.menusLoading || !noticeMenuFlags.canDelete ? t('common.menuNoDelete') : txt('삭제', 'Delete')}>
                        <span style={{ display: 'inline-flex' }}>
                          <IconButton
                            size="small"
                            disabled={noticeMenuFlags.menusLoading || !noticeMenuFlags.canDelete}
                            onClick={() => handleDeleteNotice(notice)}
                            sx={{
                              color: alpha(theme.palette.text.secondary, theme.palette.mode === 'light' ? 0.72 : 1),
                              borderRadius: '10px',
                              transition: 'color 0.15s ease, background-color 0.15s ease',
                              '&:hover': {
                                color: 'error.main',
                                bgcolor: alpha(theme.palette.error.main, 0.12),
                              },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
                    </TableBody>
                  </Table>
                </TableContainer>

              <Box sx={mvsBodyPaginationSx}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    color="primary"
                    shape="rounded"
                    sx={{ '& .MuiPaginationItem-root': { borderRadius: '10px', fontWeight: 600 } }}
                  />
              </Box>
                </>
              )}
          </Box>
        </>
      )}

      {/* 연간 스케줄표 탭 */}
      {activeTab === 1 && (
        <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 2 }}>
          <CardContent sx={{ py: 2, px: { xs: 2, sm: 2.5 }, '&:last-child': { pb: 2 } }}>
            <Box
              sx={{
                mb: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, fontSize: '1.0625rem', letterSpacing: '-0.015em', color: 'text.primary' }}
              >
                {txt('연간 스케줄표', 'Yearly Schedule')}
              </Typography>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  flexWrap: 'wrap',
                  px: 1,
                  py: 0.5,
                  borderRadius: '14px',
                  bgcolor: alpha(theme.palette.grey[500], 0.08),
                  border: `1px solid ${alpha(theme.palette.divider, 0.65)}`,
                }}
              >
                <IconButton
                  onClick={() => {
                    const prevMonth = new Date(currentDate);
                    prevMonth.setMonth(prevMonth.getMonth() - 1);
                    setCurrentDate(prevMonth);
                  }}
                  size="small"
                  aria-label="previous month"
                  sx={{ borderRadius: '10px' }}
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <Typography
                  variant="subtitle2"
                  sx={{
                    minWidth: 148,
                    textAlign: 'center',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                    color: 'text.primary',
                  }}
                >
                  {isEn
                    ? `${currentDate.toLocaleString('en-US', { month: 'long' })} ${currentDate.getFullYear()}`
                    : `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`}
                </Typography>
                <IconButton
                  onClick={() => {
                    const nextMonth = new Date(currentDate);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    setCurrentDate(nextMonth);
                  }}
                  size="small"
                  aria-label="next month"
                  sx={{ borderRadius: '10px' }}
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setCurrentDate(new Date())}
                  sx={{
                    ml: 0.5,
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    px: 1.5,
                    py: 0.5,
                    borderColor: alpha(theme.palette.divider, 0.95),
                  }}
                >
                  {txt('오늘', 'Today')}
                </Button>
              </Box>
            </Box>
            {!canManageYearlySchedule && (
              <Alert severity="info" sx={{ mb: 1.5, borderRadius: '12px' }}>
                {txt(
                  '연간 스케줄 등록·수정·삭제는 관리자(admin) 또는 시스템 관리자(root)만 할 수 있습니다. 날짜를 누르면 해당 일의 일정을 볼 수 있습니다.',
                  'Adding, editing, or deleting yearly schedule entries is limited to admin or root. Click a date to view schedules for that day.'
                )}
              </Alert>
            )}
            {renderCalendar()}
          </CardContent>
        </Card>
      )}

      {/* 공지사항 작성/수정 다이얼로그 */}
      <Dialog 
        open={openDialog} 
        onClose={() => {
          setOpenDialog(false);
          setSelectedNotice(null);
        }} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ pb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={600}>
            {selectedNotice ? '공지사항 수정' : '공지사항 작성'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 500 }}>
                제목 *
              </Typography>
              <TextField
                fullWidth
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                size="small"
                placeholder="제목을 입력하세요"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                  }
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 500 }}>
                  대상 *
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as any })}
                    sx={{
                      borderRadius: 1.5,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <MenuItem value="all">전체</MenuItem>
                    <MenuItem value="employees">직원</MenuItem>
                    <MenuItem value="managers">관리자</MenuItem>
                    <MenuItem value="specific">특정 대상</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', pt: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isPinned}
                      onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="고정하기"
                />
              </Box>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 500 }}>
                내용 *
              </Typography>
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                  bgcolor: 'background.paper',
                  '& .ProseMirror': {
                    minHeight: '300px',
                    padding: 2,
                    outline: 'none',
                    '& p.is-editor-empty:first-child::before': {
                      content: '"내용을 입력하세요..."',
                      float: 'left',
                      color: '#adb5bd',
                      pointerEvents: 'none',
                      height: 0
                    },
                    '& img': {
                      maxWidth: '100%',
                      height: 'auto',
                      display: 'block',
                      margin: '12px auto',
                      cursor: 'pointer'
                    },
                    '& table': {
                      borderCollapse: 'collapse',
                      width: '100%',
                      margin: '16px 0',
                      '& td, & th': {
                        border: '1px solid #ddd',
                        padding: '8px',
                        textAlign: 'left'
                      },
                      '& th': {
                        backgroundColor: '#f2f2f2',
                        fontWeight: 'bold'
                      }
                    },
                    '& [style*="font-size"]': {
                      // fontSize 스타일 지원
                    },
                    '& span[style*="font-size"]': {
                      // span 태그의 fontSize 스타일 지원
                    },
                    '& p[style*="font-size"]': {
                      // p 태그의 fontSize 스타일 지원
                    }
                  }
                }}
              >
                {/* 툴바 */}
                {editor && (
                  <Box sx={{
                    borderBottom: '1px solid',
                    borderColor: 'grey.300',
                    bgcolor: 'grey.50',
                    p: 1,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 0.5
                  }}>
                    <Button
                      size="small"
                      variant={editor.isActive('bold') ? 'contained' : 'text'}
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      sx={{ minWidth: 'auto', px: 1 }}
                    >
                      <strong>B</strong>
                    </Button>
                    <Button
                      size="small"
                      variant={editor.isActive('italic') ? 'contained' : 'text'}
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      sx={{ minWidth: 'auto', px: 1 }}
                    >
                      <em>I</em>
                    </Button>
                    <Button
                      size="small"
                      variant={editor.isActive('underline') ? 'contained' : 'text'}
                      onClick={() => editor.chain().focus().toggleUnderline().run()}
                      sx={{ minWidth: 'auto', px: 1 }}
                    >
                      <u>U</u>
                    </Button>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <Select
                        value={editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === 'p') {
                            editor.chain().focus().setParagraph().run();
                          } else {
                            editor.chain().focus().toggleHeading({ level: parseInt(value.replace('h', '')) as 1 | 2 | 3 }).run();
                          }
                        }}
                        sx={{ height: 32 }}
                      >
                        <MenuItem value="p">본문</MenuItem>
                        <MenuItem value="h1">제목1</MenuItem>
                        <MenuItem value="h2">제목2</MenuItem>
                        <MenuItem value="h3">제목3</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value="14px"
                        onChange={(e) => {
                          const fontSize = e.target.value;
                          // 현재 선택된 텍스트가 있으면 해당 텍스트에 적용, 없으면 다음 입력에 적용
                          editor.chain().focus().setMark('textStyle', { fontSize }).run();
                        }}
                        sx={{ height: 32 }}
                      >
                        <MenuItem value="12px">12px</MenuItem>
                        <MenuItem value="14px">14px</MenuItem>
                        <MenuItem value="16px">16px</MenuItem>
                        <MenuItem value="18px">18px</MenuItem>
                        <MenuItem value="24px">24px</MenuItem>
                      </Select>
                    </FormControl>
                    <Tooltip title="텍스트 색상">
                      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                        <IconButton
                          size="small"
                          sx={{
                            minWidth: 'auto',
                            px: 1,
                            position: 'relative'
                          }}
                        >
                          <FormatColorTextIcon fontSize="small" />
                        </IconButton>
                        <input
                          type="color"
                          value={editor.getAttributes('textStyle').color || '#000000'}
                          onChange={(e) => {
                            editor.chain().focus().setColor(e.target.value).run();
                          }}
                          style={{
                            position: 'absolute',
                            opacity: 0,
                            width: '100%',
                            height: '100%',
                            cursor: 'pointer',
                            top: 0,
                            left: 0
                          }}
                        />
                      </Box>
                    </Tooltip>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    <Tooltip title="왼쪽 정렬">
                      <IconButton
                        size="small"
                        color={editor.isActive({ textAlign: 'left' }) ? 'primary' : 'default'}
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                      >
                        <FormatAlignLeftIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="가운데 정렬">
                      <IconButton
                        size="small"
                        color={editor.isActive({ textAlign: 'center' }) ? 'primary' : 'default'}
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                      >
                        <FormatAlignCenterIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="오른쪽 정렬">
                      <IconButton
                        size="small"
                        color={editor.isActive({ textAlign: 'right' }) ? 'primary' : 'default'}
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                      >
                        <FormatAlignRightIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    <Tooltip title="이미지 삽입">
                      <IconButton
                        size="small"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.setAttribute('type', 'file');
                          input.setAttribute('accept', 'image/*');
                          input.click();
                          input.onchange = () => {
                            const file = input.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (e) => {
                                const result = e.target?.result as string;
                                if (result) {
                                  editor.chain()
                                    .focus()
                                    .setImage({ src: result })
                                    .run();
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          };
                        }}
                      >
                        <ImageIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="표 삽입">
                      <IconButton
                        size="small"
                        onClick={() => setTableDialogOpen(true)}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="파일 첨부">
                      <IconButton
                        size="small"
                        component="label"
                      >
                        <AttachFileIcon fontSize="small" />
                        <input
                          type="file"
                          hidden
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setAttachedFiles([...attachedFiles, ...files]);
                          }}
                        />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
                {/* 에디터 */}
                <EditorContent editor={editor} />
              </Box>
              {attachedFiles.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {attachedFiles.map((file, index) => (
                    <Chip
                      key={index}
                      label={file.name}
                      onDelete={() => {
                        setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
                      }}
                      sx={{ mr: 1, mb: 1 }}
                      size="small"
                    />
                  ))}
                </Box>
              )}
            </Box>
            
            {/* 표 생성 다이얼로그 */}
            <Dialog 
              open={tableDialogOpen} 
              onClose={() => setTableDialogOpen(false)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>표 만들기</DialogTitle>
              <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                  <TextField
                    label="행 수"
                    type="number"
                    value={tableRows}
                    onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                    inputProps={{ min: 1, max: 20 }}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="열 수"
                    type="number"
                    value={tableCols}
                    onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                    inputProps={{ min: 1, max: 20 }}
                    fullWidth
                    size="small"
                  />
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setTableDialogOpen(false)}>취소</Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    if (editor) {
                      const table = editor.chain().focus().insertTable({
                        rows: tableRows,
                        cols: tableCols,
                        withHeaderRow: tableHasHeader,
                      }).run();
                      setTableDialogOpen(false);
                    }
                  }}
                >
                  삽입
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: 1, borderColor: 'divider' }}>
          <Button 
            onClick={() => {
              setOpenDialog(false);
              setSelectedNotice(null);
            }}
            variant="outlined"
            sx={{ borderRadius: 1.5 }}
          >
            취소
          </Button>
          <Button 
            onClick={handleSaveNotice}
            variant="contained"
            sx={{ borderRadius: 1.5 }}
          >
            {selectedNotice ? '수정' : '작성'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={scheduleDialogOpen}
        onClose={closeScheduleDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {txt('일정 입력', 'Schedule Input')}
          {selectedScheduleDate && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
              {selectedScheduleDate.toLocaleDateString(isEn ? 'en-US' : 'ko-KR')}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {!canManageYearlySchedule && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {txt(
                '일정 등록·삭제는 관리자(admin) 이상만 가능합니다.',
                'Only admin or root users can add or remove schedule entries.'
              )}
            </Alert>
          )}
          {canManageYearlySchedule && (
            <>
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  value={newScheduleTitle}
                  onChange={(e) => setNewScheduleTitle(e.target.value)}
                  placeholder={txt('일정을 입력하세요', 'Enter a schedule')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSchedule();
                    }
                  }}
                />
                <Button variant="contained" onClick={handleAddSchedule}>
                  {txt('추가', 'Add')}
                </Button>
              </Box>
              <FormControlLabel
                sx={{ mb: 1 }}
                control={
                  <Switch
                    checked={scheduleAsCompanyHoliday}
                    onChange={(e) => setScheduleAsCompanyHoliday(e.target.checked)}
                    color="warning"
                  />
                }
                label={txt('회사 휴일로 표시', 'Mark as company holiday')}
              />
            </>
          )}

          <List sx={{ p: 0 }}>
            {selectedScheduleDate && (customSchedules[toDateKey(selectedScheduleDate)] || []).length > 0 ? (
              (customSchedules[toDateKey(selectedScheduleDate)] || []).map((item) => (
                <ListItem
                  key={item.id}
                  disableGutters
                  secondaryAction={
                    canManageYearlySchedule ? (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleDeleteSchedule(toDateKey(selectedScheduleDate), item.id)}
                      >
                        {txt('삭제', 'Delete')}
                      </Button>
                    ) : undefined
                  }
                  sx={{
                    py: 0.75,
                    px: 0.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {item.type === 'company_holiday' && (
                          <Chip
                            size="small"
                            color="warning"
                            label={txt('회사 휴일', 'Company Holiday')}
                            sx={{ height: 22 }}
                          />
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.title || txt('회사 휴일', 'Company Holiday')}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))
            ) : (
              <ListItem sx={{ px: 0, py: 1 }}>
                <ListItemText
                  primary={
                    <Typography variant="body2" color="text.secondary">
                      {txt('등록된 일정이 없습니다.', 'No schedules added for this date.')}
                    </Typography>
                  }
                />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeScheduleDialog}>
            {txt('닫기', 'Close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setNoticeToDelete(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <WarningIcon sx={{ color: 'error.main', fontSize: 28 }} />
          <Typography variant="h6" fontWeight={600}>
            공지사항 삭제 확인
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <DialogContentText sx={{ mb: 2, fontSize: '1rem' }}>
            정말로 이 공지사항을 삭제하시겠습니까?
          </DialogContentText>
          {noticeToDelete && (
            <Box sx={{ 
              p: 2, 
              bgcolor: 'grey.50', 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.200'
            }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                제목
              </Typography>
              <Typography variant="body1" fontWeight={500} sx={{ mb: 2 }}>
                {noticeToDelete.title}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                작성자
              </Typography>
              <Typography variant="body2">
                {noticeToDelete.author}
              </Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            이 작업은 되돌릴 수 없습니다. 삭제된 공지사항은 복구할 수 없습니다.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setNoticeToDelete(null);
            }}
            variant="outlined"
            sx={{ borderRadius: 1.5, textTransform: 'none', px: 3 }}
          >
            취소
          </Button>
          <Button
            onClick={confirmDeleteNotice}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            sx={{ borderRadius: 1.5, textTransform: 'none', px: 3 }}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
      >
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default NoticeManagement;
