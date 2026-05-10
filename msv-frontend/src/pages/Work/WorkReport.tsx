import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  FormControlLabel,
  Checkbox,
  Tooltip,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  Pagination,
  InputAdornment,
  Divider,
  Link,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Feedback as FeedbackIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  AttachFile as AttachFileIcon,
  Send as SendIcon
} from '@mui/icons-material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Quill from 'quill';
import QuillResize from 'quill-resize-module';
import 'quill-resize-module/dist/resize.css';
import { workReportService, api } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { useTheme, alpha } from '@mui/material/styles';
import { useStore } from '../../store';
import { useSearchParams } from 'react-router-dom';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { mvsPageTitleSx } from '../../theme/mvsLayout';

try {
  Quill.register('modules/resize', QuillResize);
} catch {
  /* HMR 등으로 이미 등록된 경우 */
}

function stripHtmlToPlain(html: string): string {
  if (!html) return '';
  if (typeof document === 'undefined') {
    return String(html)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  const root = document.createElement('div');
  root.innerHTML = html;
  return (root.textContent || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isHtmlContentEmpty(html: string): boolean {
  if (!html || !String(html).trim()) return true;
  const plain = stripHtmlToPlain(html);
  if (plain.length > 0) return false;
  return !/<img\s/i.test(html);
}

const WORK_REPORT_MAX_ATTACHMENTS = 15;
const WORK_REPORT_MAX_FILE_BYTES = 8 * 1024 * 1024;
/** 본문 HTML에 넣는 인라인 이미지(data URL) 상한 */
const WORK_REPORT_INLINE_IMAGE_MAX_BYTES = 3 * 1024 * 1024;

interface WorkReportAttachmentItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

function safeJsonParseArray(raw: unknown): unknown[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeWorkReportAttachments(raw: unknown): WorkReportAttachmentItem[] {
  return safeJsonParseArray(raw)
    .map((item, index) => {
      if (typeof item === 'string') {
        const name = item.trim();
        if (!name) return null;
        return {
          id: `legacy-${index}-${name.slice(0, 48)}`,
          name,
          mimeType: 'application/octet-stream',
          size: 0,
          dataUrl: ''
        };
      }
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        const name = typeof o.name === 'string' ? o.name.trim() : '';
        if (!name) return null;
        return {
          id: typeof o.id === 'string' && o.id ? o.id : `att-${index}-${name.slice(0, 32)}`,
          name,
          mimeType: typeof o.mimeType === 'string' ? o.mimeType : 'application/octet-stream',
          size: typeof o.size === 'number' && Number.isFinite(o.size) ? o.size : Number(o.size) || 0,
          dataUrl: typeof o.dataUrl === 'string' ? o.dataUrl : ''
        };
      }
      return null;
    })
    .filter((x): x is WorkReportAttachmentItem => x != null);
}

function formatFileSize(bytes: number, trFn: (ko: string, en: string) => string): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ${trFn('MB', 'MB')}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function newAttachmentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

interface WorkReportItem {
  id: number;
  reportId: string;
  title: string;
  type: 'daily' | 'weekly' | 'monthly' | 'project' | 'incident' | 'other';
  category?: string;
  authorId: number;
  authorName: string;
  authorDepartment: string;
  authorPosition: string;
  recipientId?: number | null;
  recipientName?: string;
  ccUserIds: number[];
  ccUsers?: { id: number; username: string }[];
  content: string;
  summary?: string;
  challenges: string[];
  nextSteps: string[];
  attachments: WorkReportAttachmentItem[];
  status: 'draft' | 'submitted' | 'reviewed' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reportDate: string;
  reviewerId?: number;
  reviewerName?: string;
  reviewComment?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isPublic: boolean;
}

type CompanyUserOption = { id: number; label: string; userid: string };

function parseCcUserIdsFromRow(raw: unknown): number[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return Array.from(new Set(raw.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0)));
  }
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw);
      return parseCcUserIdsFromRow(v);
    } catch {
      return [];
    }
  }
  return [];
}

function mapApiRowToWorkReportItem(r: any, unknownLabel: string): WorkReportItem {
  return {
    id: r.id,
    reportId: r.report_id || '',
    title: r.title || '',
    type: r.type || 'other',
    category: r.category || '',
    authorId: r.author_id,
    authorName: r.author?.username || unknownLabel,
    authorDepartment: r.author?.department || '-',
    authorPosition: r.author?.position || '-',
    recipientId: r.recipient_id != null ? Number(r.recipient_id) : null,
    recipientName: r.recipient?.username || undefined,
    ccUserIds: parseCcUserIdsFromRow(r.cc_user_ids),
    ccUsers: Array.isArray(r.cc_users)
      ? (r.cc_users as { id: number; username: string }[]).filter((x) => x && Number.isInteger(Number(x.id)))
      : [],
    content: r.content || '',
    summary: r.summary || '',
    challenges: r.challenges ? JSON.parse(r.challenges) : [],
    nextSteps: r.next_steps ? JSON.parse(r.next_steps) : [],
    attachments: normalizeWorkReportAttachments(r.attachments),
    status: r.status || 'draft',
    priority: r.priority || 'medium',
    reportDate: r.report_date || new Date().toISOString().split('T')[0],
    reviewerId: r.reviewer_id,
    reviewerName: r.reviewer?.username,
    reviewComment: r.review_comment,
    reviewedAt: r.reviewed_at,
    createdAt: r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
    tags: r.tags ? JSON.parse(r.tags) : [],
    isPublic: r.is_public || false
  };
}

const WorkReport: React.FC = () => {
  const { i18n } = useTranslation();
  const { user } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEnglish = i18n.language.startsWith('en');
  const tr = useCallback((ko: string, en: string) => (isEnglish ? en : ko), [isEnglish]);
  const theme = useTheme();
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();

  const [reports, setReports] = useState<WorkReportItem[]>([]);
  const [filteredReports, setFilteredReports] = useState<WorkReportItem[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<WorkReportItem | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [listTab, setListTab] = useState<'authored' | 'received'>('authored');
  /** 상세 진입 시 탭: 받은 보고서에서는 작성자용 제출/수정 숨김 */
  const [detailOpenedFrom, setDetailOpenedFrom] = useState<'authored' | 'received'>('authored');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [saving, setSaving] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackReportId, setFeedbackReportId] = useState<number | null>(null);
  const [feedbackBody, setFeedbackBody] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [companyUserOptions, setCompanyUserOptions] = useState<CompanyUserOption[]>([]);
  const contentQuillRef = useRef<ReactQuill | null>(null);
  const [formState, setFormState] = useState({
    title: '',
    type: 'daily' as WorkReportItem['type'],
    priority: 'medium' as WorkReportItem['priority'],
    reportDate: new Date().toISOString().split('T')[0],
    content: '',
    recipientUserId: null as number | null,
    ccUserIds: [] as number[],
    challenges: '',
    nextSteps: '',
    tags: '',
    isPublic: false,
    attachments: [] as WorkReportAttachmentItem[]
  });

  const quillModules = useMemo(
    () => ({
      resize: {
        modules: ['Resize', 'DisplaySize', 'Toolbar'],
        keyboardSelect: true,
        parchment: {
          image: {
            attribute: ['width'],
            limit: {
              minWidth: 80,
              maxWidth: 1600
            }
          }
        }
      },
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ align: [] }],
          ['blockquote', 'code-block'],
          ['link', 'image', 'clean']
        ],
        handlers: {
          image(this: { quill: any }) {
            const quill = this.quill;
            if (!quill) return;
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');
            input.click();
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;
              if (!file.type.startsWith('image/')) {
                setError(tr('이미지 파일만 삽입할 수 있습니다.', 'Only image files can be inserted.'));
                return;
              }
              if (file.size > WORK_REPORT_INLINE_IMAGE_MAX_BYTES) {
                setError(
                  tr(
                    `삽입 이미지는 최대 ${WORK_REPORT_INLINE_IMAGE_MAX_BYTES / (1024 * 1024)}MB까지 가능합니다.`,
                    `Inline images must be at most ${WORK_REPORT_INLINE_IMAGE_MAX_BYTES / (1024 * 1024)} MB.`
                  )
                );
                return;
              }
              try {
                const dataUrl = await readFileAsDataUrl(file);
                const range = quill.getSelection(true);
                const idx = range != null ? range.index : Math.max(0, quill.getLength() - 1);
                quill.insertEmbed(idx, 'image', dataUrl, 'user');
                quill.setSelection(idx + 1, 0, 'silent');
              } catch {
                setError(tr('이미지를 불러오지 못했습니다.', 'Could not read the image.'));
              }
            };
          }
        }
      }
    }),
    [tr, setError]
  );

  const quillFormats = useMemo(
    () => [
      'header',
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
      'image'
    ],
    []
  );

  useEffect(() => {
    if (!openDialog) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/users');
        if (!res.data?.success || cancelled) return;
        const cid = user?.company_id != null ? Number(user.company_id) : NaN;
        const tid = user?.tenant_id != null ? Number(user.tenant_id) : null;
        const myId = user?.id != null ? Number(user.id) : NaN;
        const list = (res.data.data || [])
          .filter((u: any) => {
            if (u.status !== 'active') return false;
            if (Number.isInteger(cid) && cid > 0 && Number(u.company_id) !== cid) return false;
            if (tid != null && Number.isInteger(tid) && u.tenant_id != null && Number(u.tenant_id) !== tid) return false;
            if (Number.isInteger(myId) && myId > 0 && Number(u.id) === myId) return false;
            return true;
          })
          .map((u: any) => ({
            id: Number(u.id),
            label: String(u.username || u.userid || u.id),
            userid: String(u.userid || '')
          }))
          .filter((o: CompanyUserOption) => Number.isInteger(o.id) && o.id > 0);
        setCompanyUserOptions(list);
      } catch {
        if (!cancelled) setCompanyUserOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openDialog, user?.company_id, user?.tenant_id, user?.id]);

  const loadReportData = useCallback(async () => {
    setError('');
    try {
      const response = await workReportService.getWorkReports({ scope: listTab });
      if (response.success) {
        const unknown = tr('알 수 없음', 'Unknown');
        const reportsData: WorkReportItem[] = (response.data || []).map((r: any) =>
          mapApiRowToWorkReportItem(r, unknown)
        );
        setReports(reportsData);
      } else {
        setError(response.message || tr('보고서 목록을 불러올 수 없습니다.', 'Failed to load report list.'));
        setReports([]);
      }
    } catch (error: any) {
      console.error('보고서 데이터 로드 오류:', error);
      setError(error.response?.data?.message || tr('보고서 데이터를 불러오는데 실패했습니다.', 'Failed to load report data.'));
      setReports([]);
    }
  }, [tr, listTab]);

  const filterReports = useCallback(() => {
    let filtered = reports;

    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.reportId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    if (typeFilter) {
      filtered = filtered.filter(report => report.type === typeFilter);
    }

    if (priorityFilter) {
      filtered = filtered.filter(report => report.priority === priorityFilter);
    }

    setFilteredReports(filtered);
  }, [reports, searchTerm, statusFilter, typeFilter, priorityFilter]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  useEffect(() => {
    filterReports();
  }, [filterReports]);

  /** 목록 필터에서 제외된 상태값이 남아 있으면 전체로 되돌림 */
  useEffect(() => {
    if (statusFilter === 'draft' || statusFilter === 'reviewed') {
      setStatusFilter('');
    }
  }, [statusFilter]);

  const reportDeepLink = searchParams.get('report');
  const listDeepLink = searchParams.get('list');

  /** 알림 등에서 `/work/reports?report=&list=` 로 진입 시 해당 보고서 상세로 연다 */
  useEffect(() => {
    if (!reportDeepLink) return;
    const reportId = parseInt(reportDeepLink, 10);
    if (!Number.isInteger(reportId) || reportId <= 0) return;

    /** 알림 등 list=cc 는 예전 탭명 — 받은 보고서로 통합 */
    const tab: 'authored' | 'received' =
      listDeepLink === 'authored' ? 'authored' : 'received';

    let cancelled = false;
    (async () => {
      try {
        setListTab(tab);
        const res = await workReportService.getWorkReport(reportId);
        if (cancelled) return;
        if (!res?.success || !res.data) {
          setError(
            (res as { message?: string })?.message ||
              tr('업무 보고서를 열 수 없습니다.', 'Could not open this work report.')
          );
          return;
        }
        const item = mapApiRowToWorkReportItem(res.data, tr('알 수 없음', 'Unknown'));
        setDetailOpenedFrom(tab);
        setSelectedReport(item);
        setViewMode('view');
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('report');
            next.delete('list');
            return next;
          },
          { replace: true }
        );
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e.response?.data?.message ||
              tr('업무 보고서를 열 수 없습니다.', 'Could not open this work report.')
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reportDeepLink, listDeepLink, setSearchParams, tr]);

  const softChipSx = (tone: 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary') => {
    const light = theme.palette.mode === 'light';
    if (tone === 'default') {
      return {
        height: 26,
        borderRadius: '8px',
        fontWeight: 600,
        fontSize: '0.6875rem',
        border: `1px solid ${light ? 'rgba(15, 23, 42, 0.12)' : theme.palette.divider}`,
        bgcolor: light ? 'rgba(0, 0, 0, 0.02)' : alpha(theme.palette.common.white, 0.06),
        color: 'text.secondary',
      } as const;
    }
    const main = tone === 'primary' ? theme.palette.primary.main : theme.palette[tone].main;
    const dark = tone === 'primary' ? theme.palette.primary.dark : theme.palette[tone].dark;
    return {
      height: 26,
      borderRadius: '8px',
      fontWeight: 600,
      fontSize: '0.6875rem',
      border: `1px solid ${alpha(main, light ? 0.3 : 0.42)}`,
      bgcolor: alpha(main, light ? 0.08 : 0.12),
      color: dark,
    } as const;
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'draft':
        return <Chip label={tr('초안', 'Draft')} size="small" sx={softChipSx('default')} />;
      case 'submitted':
        return <Chip label={tr('제출됨', 'Submitted')} size="small" sx={softChipSx('info')} />;
      case 'reviewed':
        return <Chip label={tr('검토됨', 'Reviewed')} size="small" sx={softChipSx('warning')} />;
      case 'approved':
        return <Chip label={tr('승인됨', 'Approved')} size="small" sx={softChipSx('success')} />;
      case 'rejected':
        return <Chip label={tr('피드백', 'Feedback')} size="small" sx={softChipSx('warning')} />;
      default:
        return <Chip label={tr('알 수 없음', 'Unknown')} size="small" sx={softChipSx('default')} />;
    }
  };

  const getPriorityChip = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Chip label={tr('낮음', 'Low')} size="small" sx={softChipSx('default')} />;
      case 'medium':
        return <Chip label={tr('보통', 'Medium')} size="small" sx={softChipSx('info')} />;
      case 'high':
        return <Chip label={tr('높음', 'High')} size="small" sx={softChipSx('warning')} />;
      case 'urgent':
        return <Chip label={tr('긴급', 'Urgent')} size="small" sx={softChipSx('error')} />;
      default:
        return <Chip label={tr('알 수 없음', 'Unknown')} size="small" sx={softChipSx('default')} />;
    }
  };

  const getTypeChipSx = (type: string) => {
    switch (type) {
      case 'daily':
        return softChipSx('primary');
      case 'weekly':
      case 'monthly':
        return softChipSx('info');
      case 'project':
        return softChipSx('success');
      case 'incident':
        return softChipSx('warning');
      case 'other':
      default:
        return softChipSx('default');
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'daily':
        return tr('일일 보고서', 'Daily Report');
      case 'weekly':
        return tr('주간 보고서', 'Weekly Report');
      case 'monthly':
        return tr('월간 보고서', 'Monthly Report');
      case 'project':
        return tr('프로젝트 보고서', 'Project Report');
      case 'incident':
        return tr('장애 보고서', 'Incident Report');
      case 'other':
        return tr('기타', 'Other');
      default:
        return tr('알 수 없음', 'Unknown');
    }
  };

  const handleViewReport = (report: WorkReportItem) => {
    setDetailOpenedFrom(listTab);
    setSelectedReport(report);
    setViewMode('view');
  };

  const handleEditReport = (report: WorkReportItem) => {
    setSelectedReport(report);
    const uid = user?.id != null ? Number(user.id) : NaN;
    const safeRecipient =
      report.recipientId != null &&
      report.recipientId > 0 &&
      (!Number.isInteger(uid) || uid <= 0 || Number(report.recipientId) !== uid)
        ? report.recipientId
        : null;
    const safeCc = (report.ccUserIds || []).filter((id) => !Number.isInteger(uid) || uid <= 0 || Number(id) !== uid);
    setFormState({
      title: report.title,
      type: report.type,
      priority: report.priority,
      reportDate: report.reportDate,
      content: report.content,
      recipientUserId: safeRecipient,
      ccUserIds: safeCc.length ? [...safeCc] : [],
      challenges: report.challenges.join('\n'),
      nextSteps: report.nextSteps.join('\n'),
      tags: report.tags.join(', '),
      isPublic: report.isPublic,
      attachments: report.attachments.map((a) => ({ ...a }))
    });
    setOpenDialog(true);
  };

  const handleOpenCreate = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedReport(null);
    setFormState({
      title: '',
      type: 'daily',
      priority: 'medium',
      reportDate: today,
      content: '',
      recipientUserId: null,
      ccUserIds: [],
      challenges: '',
      nextSteps: '',
      tags: '',
      isPublic: false,
      attachments: []
    });
    setOpenDialog(true);
  };

  const handleRemoveAttachment = (id: string) => {
    setFormState((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((a) => a.id !== id)
    }));
  };

  const handleAttachmentInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = input.files;
    input.value = '';
    if (!files?.length) return;

    const oversMsg = tr(
      `첨부는 최대 ${WORK_REPORT_MAX_ATTACHMENTS}개까지 가능합니다.`,
      `You can attach up to ${WORK_REPORT_MAX_ATTACHMENTS} files.`
    );
    const bigMsg = tr(
      `파일당 최대 ${WORK_REPORT_MAX_FILE_BYTES / (1024 * 1024)}MB까지 업로드할 수 있습니다.`,
      `Each file must be at most ${WORK_REPORT_MAX_FILE_BYTES / (1024 * 1024)} MB.`
    );

    let remaining = WORK_REPORT_MAX_ATTACHMENTS - formState.attachments.length;

    const collected: WorkReportAttachmentItem[] = [];
    for (const file of Array.from(files)) {
      if (remaining <= 0) {
        setError(oversMsg);
        break;
      }
      if (file.size > WORK_REPORT_MAX_FILE_BYTES) {
        setError(`${bigMsg} (${file.name})`);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        collected.push({
          id: newAttachmentId(),
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl
        });
        remaining -= 1;
      } catch {
        setError(tr('파일을 읽는 중 오류가 발생했습니다.', 'Failed to read the file.'));
      }
    }
    if (collected.length > 0) {
      setFormState((prev) => ({
        ...prev,
        attachments: [...prev.attachments, ...collected]
      }));
    }
  };

  const handleSaveReport = async () => {
    const latestHtml =
      typeof contentQuillRef.current?.getEditor?.()?.root?.innerHTML === 'string'
        ? contentQuillRef.current!.getEditor()!.root.innerHTML
        : formState.content;
    const contentForSave = latestHtml || formState.content;

    if (!formState.title.trim() || isHtmlContentEmpty(contentForSave)) {
      setError(tr('제목과 내용을 입력해주세요.', 'Please enter title and content.'));
      return;
    }
    if (!formState.recipientUserId || formState.recipientUserId <= 0) {
      setError(tr('보고서를 받는 사람을 선택해주세요.', 'Please select a report recipient.'));
      return;
    }
    const myId = user?.id != null ? Number(user.id) : NaN;
    if (Number.isInteger(myId) && myId > 0 && Number(formState.recipientUserId) === myId) {
      setError(tr('본인에게는 보고서를 보낼 수 없습니다.', 'You cannot send a report to yourself.'));
      return;
    }

    const toList = (value: string) =>
      value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);

    const tags = formState.tags
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const payload: Record<string, unknown> = {
      title: formState.title.trim(),
      type: formState.type,
      category: '',
      priority: formState.priority,
      report_date: formState.reportDate,
      due_date: null,
      content: contentForSave.trim(),
      summary: '',
      recipient_id: formState.recipientUserId,
      cc_user_ids: formState.ccUserIds.filter(
        (id) =>
          Number.isInteger(id) &&
          id > 0 &&
          id !== formState.recipientUserId &&
          !(Number.isInteger(myId) && myId > 0 && id === myId)
      ),
      achievements: [],
      challenges: toList(formState.challenges),
      next_steps: toList(formState.nextSteps),
      attachments: formState.attachments.map(({ id, name, mimeType, size, dataUrl }) => ({
        id,
        name,
        mimeType,
        size,
        dataUrl
      })),
      tags,
      is_public: formState.isPublic,
      // 신규: 다이얼로그에서 한 번에 제출(초안 없음). 기존 초안 수정은 기존 상태 유지.
      status: selectedReport ? selectedReport.status || 'draft' : 'submitted'
    };

    try {
      setSaving(true);
      const response = selectedReport
        ? await workReportService.updateWorkReport(selectedReport.id, payload)
        : await workReportService.createWorkReport(payload);

      if (response.success) {
        setSuccess(
          selectedReport
            ? tr('보고서가 수정되었습니다.', 'Report has been updated.')
            : tr('보고서가 제출되었습니다.', 'Report has been submitted.')
        );
        setOpenDialog(false);
        loadReportData();
      } else {
        setError(response.message || tr('보고서 저장에 실패했습니다.', 'Failed to save report.'));
      }
    } catch (error: any) {
      console.error('보고서 저장 오류:', error);
      setError(error.response?.data?.message || tr('An error occurred while saving report.', 'An error occurred while saving report.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReport = (id: number) => {
    showConfirm(
      tr('정말로 이 보고서를 삭제하시겠습니까?', 'Are you sure you want to delete this report?'),
      () => {
        void (async () => {
          try {
            const response = await workReportService.deleteWorkReport(id);
            if (response.success) {
              setSuccess(tr('보고서가 성공적으로 삭제되었습니다.', 'Report deleted successfully.'));
              loadReportData();
            } else {
              setError(response.message || tr('보고서 삭제에 실패했습니다.', 'Failed to delete report.'));
            }
          } catch (error: any) {
            console.error('삭제 오류:', error);
            setError(error.response?.data?.message || tr('삭제 중 오류가 발생했습니다.', 'An error occurred while deleting.'));
          }
        })();
      },
      {
        title: tr('삭제 확인', 'Confirm delete'),
        confirmColor: 'error',
        confirmText: tr('삭제', 'Delete'),
        cancelText: tr('취소', 'Cancel')
      }
    );
  };

  const handleSubmitReport = async (id: number) => {
    try {
      const response = await workReportService.submitWorkReport(id);
      if (response.success) {
        setSuccess(
          tr('보고서가 제출되었습니다. 수신자가 승인할 수 있습니다.', 'Report submitted. The recipient can approve it.')
        );
        setViewMode('list');
        setSelectedReport(null);
        setDetailOpenedFrom('authored');
        loadReportData();
      } else {
        setError(response.message || tr('제출에 실패했습니다.', 'Failed to submit.'));
      }
    } catch (error: any) {
      console.error('보고서 제출 오류:', error);
      setError(error.response?.data?.message || tr('제출 중 오류가 발생했습니다.', 'An error occurred while submitting.'));
    }
  };

  const handleApproveReport = async (id: number) => {
    try {
      const response = await workReportService.reviewWorkReport(id, 'approved');
      if (response.success) {
        setSuccess(tr('보고서가 승인되었습니다.', 'Report approved.'));
        loadReportData();
        if (viewMode === 'view' && selectedReport?.id === id) {
          setViewMode('list');
        }
      } else {
        setError(response.message || tr('보고서 승인에 실패했습니다.', 'Failed to approve report.'));
      }
    } catch (error: any) {
      console.error('보고서 승인 오류:', error);
      setError(error.response?.data?.message || tr('보고서 승인 중 오류가 발생했습니다.', 'An error occurred while approving report.'));
    }
  };

  const openFeedbackDialog = (id: number) => {
    setFeedbackReportId(id);
    setFeedbackBody('');
    setFeedbackOpen(true);
  };

  const closeFeedbackDialog = () => {
    if (!feedbackSending) {
      setFeedbackOpen(false);
      setFeedbackReportId(null);
      setFeedbackBody('');
    }
  };

  const handleConfirmFeedback = async () => {
    if (feedbackReportId == null) return;
    const comment = feedbackBody.trim();
    if (!comment) {
      setError(tr('피드백 내용을 입력해 주세요.', 'Please enter your feedback.'));
      return;
    }
    try {
      setFeedbackSending(true);
      const response = await workReportService.reviewWorkReport(feedbackReportId, 'rejected', comment);
      if (response.success) {
        setSuccess(tr('피드백이 전달되었습니다.', 'Feedback has been sent.'));
        setFeedbackOpen(false);
        setFeedbackReportId(null);
        setFeedbackBody('');
        loadReportData();
        if (viewMode === 'view' && selectedReport?.id === feedbackReportId) {
          setViewMode('list');
        }
      } else {
        setError(response.message || tr('피드백 전송에 실패했습니다.', 'Failed to send feedback.'));
      }
    } catch (error: any) {
      console.error('보고서 피드백 오류:', error);
      setError(
        error.response?.data?.message ||
          tr('피드백 전송 중 오류가 발생했습니다.', 'An error occurred while sending feedback.')
      );
    } finally {
      setFeedbackSending(false);
    }
  };



  const pendingCount = reports.filter(report => report.status === 'submitted' || report.status === 'reviewed').length;
  const approvedCount = reports.filter(report => report.status === 'approved').length;
  const rejectedCount = reports.filter(report => report.status === 'rejected').length;
  const urgentCount = reports.filter(report => report.priority === 'urgent').length;

  const paginatedReports = filteredReports.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  /** 업무 보고서 상세 — 본문 카드 대비 섹션 영역을 한 단계 진하게 */
  const workReportDetailSectionSx = useMemo(
    () => ({
      bgcolor:
        theme.palette.mode === 'light'
          ? theme.palette.grey[100]
          : alpha(theme.palette.common.white, 0.08),
      border: '1px solid',
      borderColor:
        theme.palette.mode === 'light'
          ? alpha(theme.palette.common.black, 0.08)
          : alpha(theme.palette.common.white, 0.1),
      borderRadius: 2,
    }),
    [theme]
  );

  const feedbackDialog = (
    <Dialog
      open={feedbackOpen}
      onClose={closeFeedbackDialog}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={feedbackSending}
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.12)'
        }
      }}
    >
      <DialogTitle sx={{ fontWeight: 600, color: '#000', pb: 0.5, pt: 2.5, px: 3 }}>
        {tr('피드백', 'Feedback')}
      </DialogTitle>
      <DialogContent sx={{ px: 3, pt: 1 }}>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.6 }}>
          {tr('작성자에게 전달할 피드백을 입력해 주세요.', 'Enter feedback to send to the author.')}
        </Typography>
        <TextField
          autoFocus
          multiline
          minRows={5}
          fullWidth
          value={feedbackBody}
          onChange={(e) => setFeedbackBody(e.target.value)}
          placeholder={tr('피드백을 입력하세요…', 'Enter your feedback…')}
          disabled={feedbackSending}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 1.5,
              bgcolor: 'grey.50'
            }
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
        <Button variant="outlined" onClick={closeFeedbackDialog} disabled={feedbackSending}>
          {tr('취소', 'Cancel')}
        </Button>
        <Button variant="contained" onClick={handleConfirmFeedback} disabled={feedbackSending}>
          {tr('전달', 'Send')}
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (viewMode === 'view' && selectedReport) {
    const uid = user?.id != null ? Number(user.id) : NaN;
    const isReportAuthor = Number.isInteger(uid) && uid > 0 && Number(selectedReport.authorId) === uid;
    const isReportRecipient =
      Number.isInteger(uid) &&
      uid > 0 &&
      selectedReport.recipientId != null &&
      Number(selectedReport.recipientId) === uid;
    const inCcList =
      Number.isInteger(uid) &&
      uid > 0 &&
      (selectedReport.ccUserIds || []).includes(uid);
    const isElevatedReviewer =
      user?.role === 'root' || user?.role === 'admin' || user?.role === 'audit';
    /** 참조만인 경우 승인 불가(관리자라도 참조로만 지정된 경우). 정식 수신자·(참조 아닌) 관리자만 승인 */
    const canApproveSubmitted =
      selectedReport.status === 'submitted' &&
      !isReportAuthor &&
      (isReportRecipient || isElevatedReviewer) &&
      !(inCcList && !isReportRecipient);
    /** 피드백: 수신자·참조·관리자(작성자 제외) */
    const canSendFeedbackSubmitted =
      selectedReport.status === 'submitted' &&
      !isReportAuthor &&
      (isReportRecipient || isElevatedReviewer || inCcList);

    return (
      <>
        <Box
          sx={{
            p: 0,
            width: '100%',
            maxWidth: '100%',
            bgcolor: 'transparent',
            minHeight: '100%',
          }}
        >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Typography
            variant="pageTitle"
            component="h1"
            sx={{
              fontSize: { xs: '1.125rem', sm: '1.3125rem' },
              fontWeight: 600,
              letterSpacing: '-0.022em',
              lineHeight: 1.28,
            }}
          >
            {tr('업무 보고서 상세', 'Work Report Detail')}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setViewMode('list')}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              borderColor: 'divider',
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
            }}
          >
            {tr('목록으로', 'Back to List')}
          </Button>
        </Box>

        {detailOpenedFrom === 'received' &&
          selectedReport.status === 'draft' &&
          isReportRecipient && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {tr(
                '초안은 작성자가 「작성한 보고서」에서 제출한 뒤 승인할 수 있습니다.',
                'Draft reports can be approved after the author submits them from “My reports”.'
              )}
            </Alert>
          )}

        {selectedReport.status === 'submitted' && isReportAuthor && isReportRecipient && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {tr(
              '작성자와 수신자가 모두 본인이면 자기 검토를 막기 위해 승인·피드백 버튼이 나오지 않습니다. 다른 사람을 수신자로 지정하면 해당 사용자에게 버튼이 표시됩니다.',
              'If you are both the author and the official recipient, Approve and Feedback stay hidden to prevent self-review. Pick another recipient if someone else should act on this report.'
            )}
          </Alert>
        )}

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {selectedReport.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  {tr('보고서 번호', 'Report No.')}: {selectedReport.reportId}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  {getStatusChip(selectedReport.status)}
                  {getPriorityChip(selectedReport.priority)}
                  <Chip label={getTypeLabel(selectedReport.type)} size="small" sx={getTypeChipSx(selectedReport.type)} />
                  {selectedReport.isPublic && (
                    <Chip label={tr('공개', 'Public')} size="small" sx={softChipSx('info')} />
                  )}
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" color="text.secondary">
                  {tr('작성일', 'Report Date')}: {selectedReport.reportDate}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* 작성자 정보 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{tr('작성자 정보', 'Author Info')}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', p: 2, ...workReportDetailSectionSx }}>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {selectedReport.authorName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedReport.authorPosition} • {selectedReport.authorDepartment}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {selectedReport.recipientName && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>{tr('보고서 수신자', 'Report recipient')}</Typography>
                <Card sx={{ p: 2, boxShadow: 'none', ...workReportDetailSectionSx }}>
                  <Typography variant="body1">{selectedReport.recipientName}</Typography>
                </Card>
              </Box>
            )}

            {(selectedReport.ccUsers?.length ?? 0) > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  {tr('참조', 'CC')}
                </Typography>
                <Card sx={{ p: 2, boxShadow: 'none', ...workReportDetailSectionSx }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {(selectedReport.ccUsers || []).map((u) => (
                      <Chip key={u.id} size="small" label={u.username || String(u.id)} variant="outlined" />
                    ))}
                  </Box>
                </Card>
              </Box>
            )}

            {/* 도전과제 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{tr('도전과제', 'Challenges')}</Typography>
              <Box sx={{ p: 2, ...workReportDetailSectionSx }}>
                <List disablePadding>
                  {selectedReport.challenges.map((challenge, index) => (
                    <ListItem key={index} disableGutters sx={{ py: 0.5 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'warning.main', width: 32, height: 32 }}>
                          <PendingIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={challenge} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Box>

            {/* 다음 단계 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{tr('다음 단계', 'Next Steps')}</Typography>
              <Box sx={{ p: 2, ...workReportDetailSectionSx }}>
                <List disablePadding>
                  {selectedReport.nextSteps.map((step, index) => (
                    <ListItem key={index} disableGutters sx={{ py: 0.5 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'info.main', width: 32, height: 32 }}>
                          <ScheduleIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={step} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Box>

            {/* 상세 내용 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{tr('상세 내용', 'Details')}</Typography>
              <Card sx={{ p: 2, boxShadow: 'none', ...workReportDetailSectionSx }}>
                <Box
                  className="work-report-html-content"
                  sx={{ '& img': { maxWidth: '100%', height: 'auto' }, '& p': { mb: 1 } }}
                  dangerouslySetInnerHTML={{ __html: selectedReport.content || '' }}
                />
              </Card>
            </Box>

            {/* 첨부파일 */}
            {selectedReport.attachments.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>{tr('첨부파일', 'Attachments')}</Typography>
                <Box sx={{ p: 2, ...workReportDetailSectionSx }}>
                  <List disablePadding>
                    {selectedReport.attachments.map((att) => (
                      <ListItem key={att.id} disableGutters sx={{ py: 0.5 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <AttachFileIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            att.dataUrl && att.dataUrl.startsWith('data:') ? (
                              <Link href={att.dataUrl} download={att.name} underline="hover">
                                {att.name}
                              </Link>
                            ) : (
                              att.name
                            )
                          }
                          secondary={att.size > 0 ? formatFileSize(att.size, tr) : undefined}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Box>
            )}

            {/* 태그 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{tr('태그', 'Tags')}</Typography>
              <Box sx={{ p: 2, ...workReportDetailSectionSx, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedReport.tags.map((tag, index) => (
                  <Chip key={index} label={tag} variant="outlined" />
                ))}
              </Box>
            </Box>

            {/* 검토 정보 */}
            {selectedReport.reviewerName && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>{tr('검토 정보', 'Review Info')}</Typography>
                <Card sx={{ p: 2, boxShadow: 'none', ...workReportDetailSectionSx }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>{tr('검토자', 'Reviewer')}:</strong> {selectedReport.reviewerName}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>{tr('검토일', 'Reviewed At')}:</strong> {selectedReport.reviewedAt}
                  </Typography>
                  {selectedReport.reviewComment && (
                    <Typography variant="body1">
                      <strong>
                        {selectedReport.status === 'rejected'
                          ? tr('피드백', 'Feedback')
                          : tr('검토 의견', 'Review comment')}
                        :
                      </strong>{' '}
                      {selectedReport.reviewComment}
                    </Typography>
                  )}
                </Card>
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {isReportAuthor &&
                selectedReport.status === 'draft' &&
                detailOpenedFrom === 'authored' && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SendIcon />}
                    onClick={() => handleSubmitReport(selectedReport.id)}
                  >
                    {tr('제출', 'Submit')}
                  </Button>
                )}
              {canApproveSubmitted && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleApproveReport(selectedReport.id)}
                >
                  {tr('승인', 'Approve')}
                </Button>
              )}
              {canSendFeedbackSubmitted && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<FeedbackIcon />}
                  onClick={() => openFeedbackDialog(selectedReport.id)}
                >
                  {tr('피드백', 'Feedback')}
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
        </Box>
        {feedbackDialog}
      </>
    );
  }

  const kpiCardSx = {
    borderRadius: '16px',
    border: '1px solid',
    borderColor: alpha(theme.palette.divider, theme.palette.mode === 'light' ? 0.1 : 0.35),
    boxShadow:
      theme.palette.mode === 'light' ? '0 2px 14px rgba(15, 23, 42, 0.05)' : '0 2px 12px rgba(0,0,0,0.25)',
    bgcolor: 'background.paper',
  } as const;

  const reportDialogFieldLabelSx = {
    mb: 0.75,
    fontSize: '0.8125rem',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: 'text.secondary',
  } as const;

  return (
    <Box sx={{ p: 0, width: '100%', maxWidth: '100%', bgcolor: 'transparent', minHeight: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Typography component="h1" sx={{ ...mvsPageTitleSx, color: 'text.primary' }}>
          {tr('업무 보고서', 'Work Reports')}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          disableElevation
          startIcon={<AddIcon sx={{ fontSize: 20 }} />}
          onClick={handleOpenCreate}
          sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
        >
          {tr('보고서 제출', 'Submit report')}
        </Button>
      </Box>

      <Card
        elevation={0}
        sx={{
          mb: 2,
          borderRadius: '16px',
          overflow: 'hidden',
          border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'light' ? 0.1 : 0.35)}`,
          boxShadow:
            theme.palette.mode === 'light' ? '0 2px 14px rgba(15, 23, 42, 0.05)' : '0 2px 12px rgba(0,0,0,0.25)',
        }}
      >
        <Tabs
          value={listTab}
          onChange={(_, v) => {
            setListTab(v as 'authored' | 'received');
            setPage(1);
          }}
          sx={{
            minHeight: 48,
            px: 1,
            '& .MuiTabs-indicator': {
              height: 2,
              borderRadius: '2px 2px 0 0',
              bgcolor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.85)' : theme.palette.grey[300],
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              color: 'text.secondary',
              minHeight: 48,
            },
            '& .MuiTab-root.Mui-selected': {
              color: 'text.primary',
              fontWeight: 600,
            },
          }}
        >
          <Tab label={tr('작성한 보고서', 'My reports')} value="authored" />
          <Tab label={tr('받은 보고서', 'Inbox')} value="received" />
        </Tabs>
      </Card>

      {/* 통계 카드 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Card elevation={0} sx={kpiCardSx}>
          <CardContent sx={{ py: 2, px: 2.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
              {tr('대기중인 보고서', 'Pending Reports')}
            </Typography>
            <Typography variant="kpiNumber" sx={{ fontWeight: 600, color: 'warning.dark' }}>
              {pendingCount}
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={kpiCardSx}>
          <CardContent sx={{ py: 2, px: 2.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
              {tr('승인된 보고서', 'Approved Reports')}
            </Typography>
            <Typography variant="kpiNumber" sx={{ fontWeight: 600, color: 'success.dark' }}>
              {approvedCount}
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={kpiCardSx}>
          <CardContent sx={{ py: 2, px: 2.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
              {tr('피드백 보고서', 'Reports with feedback')}
            </Typography>
            <Typography variant="kpiNumber" sx={{ fontWeight: 600, color: 'error.dark' }}>
              {rejectedCount}
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={kpiCardSx}>
          <CardContent sx={{ py: 2, px: 2.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
              {tr('긴급 보고서', 'Urgent Reports')}
            </Typography>
            <Typography variant="kpiNumber" sx={{ fontWeight: 600, color: 'error.dark' }}>
              {urgentCount}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 필터 및 검색 */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: '16px',
          border: 'none',
          boxShadow: 'none',
          bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.03),
        }}
      >
        <CardContent sx={{ py: 2, px: 2.5 }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr 1fr' },
            gap: 2, 
            alignItems: 'center' 
          }}>
            <TextField
              fullWidth
              size="small"
              placeholder={tr('제목, 보고서번호, 작성자, 내용 검색', 'Search title, report no, author, content')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                bgcolor: 'background.paper',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  '& fieldset': {
                    borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.1)' : undefined,
                  },
                },
              }}
            />
            <FormControl fullWidth size="small" variant="outlined">
              <InputLabel id="work-report-filter-status-label" shrink>
                {tr('상태', 'Status')}
              </InputLabel>
              <Select
                labelId="work-report-filter-status-label"
                id="work-report-filter-status"
                label={tr('상태', 'Status')}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">{tr('전체', 'All')}</MenuItem>
                <MenuItem value="submitted">{tr('제출됨', 'Submitted')}</MenuItem>
                <MenuItem value="approved">{tr('승인됨', 'Approved')}</MenuItem>
                <MenuItem value="rejected">{tr('피드백', 'Feedback')}</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" variant="outlined">
              <InputLabel id="work-report-filter-type-label" shrink>
                {tr('유형', 'Type')}
              </InputLabel>
              <Select
                labelId="work-report-filter-type-label"
                id="work-report-filter-type"
                label={tr('유형', 'Type')}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">{tr('전체', 'All')}</MenuItem>
                <MenuItem value="daily">{tr('일일 보고서', 'Daily Report')}</MenuItem>
                <MenuItem value="weekly">{tr('주간 보고서', 'Weekly Report')}</MenuItem>
                <MenuItem value="monthly">{tr('월간 보고서', 'Monthly Report')}</MenuItem>
                <MenuItem value="project">{tr('프로젝트 보고서', 'Project Report')}</MenuItem>
                <MenuItem value="incident">{tr('장애 보고서', 'Incident Report')}</MenuItem>
                <MenuItem value="other">{tr('기타', 'Other')}</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" variant="outlined">
              <InputLabel id="work-report-filter-priority-label" shrink>
                {tr('우선순위', 'Priority')}
              </InputLabel>
              <Select
                labelId="work-report-filter-priority-label"
                id="work-report-filter-priority"
                label={tr('우선순위', 'Priority')}
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">{tr('전체', 'All')}</MenuItem>
                <MenuItem value="low">{tr('낮음', 'Low')}</MenuItem>
                <MenuItem value="medium">{tr('보통', 'Medium')}</MenuItem>
                <MenuItem value="high">{tr('높음', 'High')}</MenuItem>
                <MenuItem value="urgent">{tr('긴급', 'Urgent')}</MenuItem>
              </Select>
            </FormControl>
            <Button
              fullWidth
              size="small"
              variant="outlined"
              startIcon={<FilterIcon sx={{ fontSize: 18 }} />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setTypeFilter('');
                setPriorityFilter('');
              }}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.16)' : undefined,
                  bgcolor: 'action.hover',
                  color: 'text.primary',
                },
              }}
            >
              {tr('초기화', 'Reset')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 보고서 목록 테이블 */}
      <Card
        elevation={0}
        sx={{
          borderRadius: '20px',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider',
          boxShadow:
            theme.palette.mode === 'light' ? '0 2px 14px rgba(15, 23, 42, 0.05)' : '0 4px 18px rgba(0,0,0,0.3)',
          bgcolor: 'background.paper',
        }}
      >
        <TableContainer sx={{ bgcolor: 'transparent' }}>
          <Table
            sx={{
              borderCollapse: 'collapse',
              '& .MuiTableCell-root': {
                borderLeft: 'none',
                borderRight: 'none',
                borderTop: 'none',
              },
            }}
          >
            <TableHead
              sx={{
                '& .MuiTableCell-head': {
                  bgcolor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : alpha(theme.palette.common.white, 0.04),
                  color: theme.palette.mode === 'light' ? 'rgba(60, 60, 67, 0.6)' : theme.palette.grey[300],
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  letterSpacing: '0.01em',
                  borderBottom: `1px solid ${
                    theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.06)' : theme.palette.divider
                  }`,
                  py: 1.5,
                  px: 2,
                },
              }}
            >
              <TableRow>
                <TableCell>{tr('보고서 정보', 'Report')}</TableCell>
                <TableCell>{tr('작성자', 'Author')}</TableCell>
                <TableCell>{tr('유형', 'Type')}</TableCell>
                <TableCell>{tr('우선순위', 'Priority')}</TableCell>
                <TableCell>{tr('상태', 'Status')}</TableCell>
                <TableCell>{tr('작성일', 'Date')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody
              sx={{
                '& .MuiTableCell-body': {
                  py: 1.5,
                  px: 2,
                  fontSize: '0.875rem',
                  borderBottom: `1px solid ${
                    theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.06)' : theme.palette.divider
                  }`,
                },
                '& .MuiTableRow-root:last-of-type .MuiTableCell-body': {
                  borderBottom: 'none',
                },
              }}
            >
              {paginatedReports.map((report) => (
                <TableRow
                  key={report.id}
                  hover
                  onClick={() => handleViewReport(report)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <TableCell>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {report.title}
                        </Typography>
                        {listTab === 'received' &&
                          user?.id != null &&
                          (report.ccUserIds || []).includes(Number(user.id)) &&
                          !(
                            report.recipientId != null &&
                            Number(report.recipientId) === Number(user.id)
                          ) && (
                          <Chip label={tr('참조', 'CC')} size="small" variant="outlined" color="default" />
                        )}
                      </Box>
                      {listTab === 'authored' &&
                        report.status === 'draft' &&
                        user?.id != null &&
                        Number(user.id) === Number(report.authorId) && (
                          <Link
                            component="button"
                            type="button"
                            variant="body2"
                            sx={{ display: 'block', mt: 0.5, textAlign: 'left', cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditReport(report);
                            }}
                          >
                            {tr('수정', 'Edit')}
                          </Link>
                        )}
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.75 }}>
                        {report.tags.slice(0, 2).map((tag, index) => (
                          <Chip key={index} label={tag} size="small" variant="outlined" />
                        ))}
                        {report.tags.length > 2 && (
                          <Chip label={`+${report.tags.length - 2}`} size="small" variant="outlined" />
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {report.authorName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {report.authorDepartment}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={getTypeLabel(report.type)} size="small" sx={getTypeChipSx(report.type)} />
                  </TableCell>
                  <TableCell>{getPriorityChip(report.priority)}</TableCell>
                  <TableCell>{getStatusChip(report.status)}</TableCell>
                  <TableCell>{report.reportDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 페이지네이션 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2.5, px: 2 }}>
          <Pagination
            count={Math.ceil(filteredReports.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            shape="rounded"
            sx={{
              '& .MuiPaginationItem-root': {
                borderRadius: '10px',
                fontWeight: 600,
                minWidth: 36,
                height: 36,
              },
              '& .Mui-selected': {
                bgcolor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : alpha(theme.palette.common.white, 0.12),
                color: 'text.primary',
                '&:hover': {
                  bgcolor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.12)' : alpha(theme.palette.common.white, 0.16),
                },
              },
            }}
          />
        </Box>
      </Card>

      {/* 보고서 제출(신규) / 수정 다이얼로그 */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', overflow: 'hidden' } }}
      >
        <DialogTitle
          sx={{
            pt: 2.5,
            px: 3,
            pb: 1.25,
            fontSize: '1.125rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'text.primary',
          }}
        >
          {selectedReport ? tr('보고서 수정', 'Edit Report') : tr('보고서 제출', 'Submit report')}
        </DialogTitle>
        <DialogContent sx={{ px: 3, pt: 0, pb: 1 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: { xs: 2.25, sm: 2.75 },
              color: 'text.primary',
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.1 : 0.05),
                transition: theme.transitions.create(['background-color', 'box-shadow'], { duration: 150 }),
                '&:hover': {
                  bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.14 : 0.08),
                },
                '&.Mui-focused': {
                  bgcolor: 'background.paper',
                  boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
                },
                '& fieldset': {
                  borderColor: alpha(theme.palette.divider, 0.9),
                },
              },
              '& .MuiOutlinedInput-input::placeholder': {
                color: theme.palette.text.secondary,
                opacity: 1,
              },
              '& .MuiInputLabel-root': { fontSize: '0.8125rem' },
              '& .ql-toolbar': {
                borderTopLeftRadius: 13,
                borderTopRightRadius: 13,
              },
              '& .ql-container': {
                borderBottomLeftRadius: 13,
                borderBottomRightRadius: 13,
              },
              '& .ql-editor': { color: 'text.primary' },
              '& .ql-editor.ql-blank::before': { color: theme.palette.text.secondary },
            }}
          >
            <Box>
              <Typography variant="body2" sx={reportDialogFieldLabelSx}>
                {tr('제목', 'Title')} *
              </Typography>
              <TextField
                value={formState.title}
                onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                fullWidth
                placeholder={tr('제목을 입력하세요', 'Enter title')}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={reportDialogFieldLabelSx}>
                {tr('유형', 'Type')}
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={formState.type}
                  onChange={(e) => setFormState((prev) => ({ ...prev, type: e.target.value as WorkReportItem['type'] }))}
                >
                  <MenuItem value="daily">{tr('일일 보고서', 'Daily Report')}</MenuItem>
                  <MenuItem value="weekly">{tr('주간 보고서', 'Weekly Report')}</MenuItem>
                  <MenuItem value="monthly">{tr('월간 보고서', 'Monthly Report')}</MenuItem>
                  <MenuItem value="project">{tr('프로젝트 보고서', 'Project Report')}</MenuItem>
                  <MenuItem value="incident">{tr('장애 보고서', 'Incident Report')}</MenuItem>
                  <MenuItem value="other">{tr('기타', 'Other')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1' } }}>
              <Typography variant="body2" sx={reportDialogFieldLabelSx}>
                {tr('보고서 수신자', 'Report recipient')} *
              </Typography>
              <Autocomplete
                options={companyUserOptions}
                getOptionLabel={(o) => `${o.label}${o.userid ? ` (${o.userid})` : ''}`}
                value={companyUserOptions.find((o) => o.id === formState.recipientUserId) ?? null}
                onChange={(_, v) =>
                  setFormState((prev) => {
                    const rid = v?.id ?? null;
                    return {
                      ...prev,
                      recipientUserId: rid,
                      ccUserIds:
                        rid != null ? prev.ccUserIds.filter((id) => id !== rid) : prev.ccUserIds
                    };
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={tr('수신자를 검색하여 선택하세요', 'Search and select recipient')}
                    fullWidth
                  />
                )}
                isOptionEqualToValue={(a, b) => a.id === b.id}
              />
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1' } }}>
              <Typography variant="body2" sx={reportDialogFieldLabelSx}>
                {tr('참조 (열람·피드백만, 승인 불가)', 'CC (view & feedback only; cannot approve)')}
              </Typography>
              <Autocomplete
                multiple
                options={companyUserOptions.filter((o) => o.id !== formState.recipientUserId)}
                getOptionLabel={(o) => `${o.label}${o.userid ? ` (${o.userid})` : ''}`}
                value={companyUserOptions.filter((o) => formState.ccUserIds.includes(o.id))}
                onChange={(_, v) =>
                  setFormState((prev) => ({
                    ...prev,
                    ccUserIds: (v ?? []).map((o) => o.id).filter((id) => id !== prev.recipientUserId)
                  }))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={tr('참조 인원을 검색하여 추가', 'Search and add CC recipients')}
                    fullWidth
                  />
                )}
                isOptionEqualToValue={(a, b) => a.id === b.id}
              />
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1', sm: '1 / 2' } }}>
              <Typography variant="body2" sx={reportDialogFieldLabelSx}>
                {tr('우선순위', 'Priority')}
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={formState.priority}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, priority: e.target.value as WorkReportItem['priority'] }))
                  }
                >
                  <MenuItem value="low">{tr('낮음', 'Low')}</MenuItem>
                  <MenuItem value="medium">{tr('보통', 'Medium')}</MenuItem>
                  <MenuItem value="high">{tr('높음', 'High')}</MenuItem>
                  <MenuItem value="urgent">{tr('긴급', 'Urgent')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1', sm: '2 / 3' } }}>
              <Typography variant="body2" sx={reportDialogFieldLabelSx}>
                {tr('작성일', 'Report Date')}
              </Typography>
              <TextField
                type="date"
                value={formState.reportDate}
                onChange={(e) => setFormState((prev) => ({ ...prev, reportDate: e.target.value }))}
                fullWidth
              />
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1' } }}>
              <Typography variant="body2" sx={reportDialogFieldLabelSx}>
                {tr('내용', 'Content')} *
              </Typography>
              <Box
                sx={{
                  border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                  borderRadius: '14px',
                  overflow: 'hidden',
                  bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.06 : 0.04),
                  boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.04 : 0.5)}`,
                  '& .ql-toolbar': {
                    border: 'none',
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                    bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.1 : 0.06),
                  },
                  '& .ql-container': { border: 'none', minHeight: 240, fontSize: '0.9375rem' },
                  '& .ql-editor img': { maxWidth: '100%', height: 'auto', display: 'block' },
                }}
              >
                <ReactQuill
                  ref={contentQuillRef}
                  theme="snow"
                  value={formState.content}
                  onChange={(html) => setFormState((prev) => ({ ...prev, content: html }))}
                  modules={quillModules}
                  formats={quillFormats}
                />
              </Box>
            </Box>
            <Box>
              <Typography variant="body2" sx={reportDialogFieldLabelSx}>
                {tr('이슈/도전 과제 (한 줄에 하나씩)', 'Issues/Challenges (one per line)')}
              </Typography>
              <TextField
                value={formState.challenges}
                onChange={(e) => setFormState((prev) => ({ ...prev, challenges: e.target.value }))}
                fullWidth
                multiline
                minRows={3}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={reportDialogFieldLabelSx}>
                {tr('다음 계획 (한 줄에 하나씩)', 'Next plans (one per line)')}
              </Typography>
              <TextField
                value={formState.nextSteps}
                onChange={(e) => setFormState((prev) => ({ ...prev, nextSteps: e.target.value }))}
                fullWidth
                multiline
                minRows={3}
              />
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1' } }}>
              <Typography variant="body2" sx={reportDialogFieldLabelSx}>
                {tr('첨부파일', 'Attachments')}
              </Typography>
              <Typography variant="caption" display="block" sx={{ mb: 1.25, color: 'text.secondary', letterSpacing: '-0.01em' }}>
                {tr(
                  `최대 ${WORK_REPORT_MAX_ATTACHMENTS}개, 파일당 ${WORK_REPORT_MAX_FILE_BYTES / (1024 * 1024)}MB 이하`,
                  `Up to ${WORK_REPORT_MAX_ATTACHMENTS} files, max ${WORK_REPORT_MAX_FILE_BYTES / (1024 * 1024)} MB each`
                )}
              </Typography>
              <Button
                variant="outlined"
                color="inherit"
                component="label"
                size="small"
                startIcon={<AttachFileIcon sx={{ fontSize: 18 }} />}
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderStyle: 'dashed',
                  borderColor: alpha(theme.palette.text.primary, 0.22),
                  color: 'text.primary',
                  bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.08 : 0.04),
                  '&:hover': {
                    borderColor: alpha(theme.palette.primary.main, 0.45),
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.06),
                  },
                }}
              >
                {tr('파일 선택', 'Choose files')}
                <input type="file" hidden multiple onChange={handleAttachmentInputChange} />
              </Button>
              {formState.attachments.length > 0 && (
                <List
                  dense
                  sx={{
                    mt: 1.25,
                    border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.06 : 0.03),
                  }}
                >
                  {formState.attachments.map((att) => (
                    <ListItem
                      key={att.id}
                      secondaryAction={
                        <Tooltip title={tr('삭제', 'Remove')}>
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => handleRemoveAttachment(att.id)}
                            aria-label={tr('첨부 삭제', 'Remove attachment')}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.2 : 0.14),
                          }}
                        >
                          <AttachFileIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={att.name}
                        secondary={att.size > 0 ? formatFileSize(att.size, tr) : undefined}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1' } }}>
              <Typography variant="body2" sx={reportDialogFieldLabelSx}>
                {tr('태그 (쉼표로 구분)', 'Tags (comma separated)')}
              </Typography>
              <TextField
                value={formState.tags}
                onChange={(e) => setFormState((prev) => ({ ...prev, tags: e.target.value }))}
                fullWidth
                placeholder={tr('태그를 입력하세요', 'Enter tags')}
              />
            </Box>
            <FormControlLabel
              sx={{
                gridColumn: { xs: '1 / -1' },
                mt: 0.25,
                alignItems: 'flex-start',
                '& .MuiFormControlLabel-label': {
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  color: 'text.primary',
                  pt: 0.25,
                },
              }}
              control={
                <Checkbox
                  checked={formState.isPublic}
                  onChange={(e) => setFormState((prev) => ({ ...prev, isPublic: e.target.checked }))}
                  sx={{ borderRadius: '6px' }}
                />
              }
              label={tr('공개 보고서', 'Public report')}
            />
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 2.5,
            gap: 1,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
            bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.06 : 0.03),
          }}
        >
          <Box sx={{ flex: 1 }} />
          <Button
            onClick={() => setOpenDialog(false)}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '12px', px: 2 }}
          >
            {tr('취소', 'Cancel')}
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleSaveReport}
            disabled={saving}
            startIcon={selectedReport ? <EditIcon sx={{ fontSize: 20 }} /> : <SendIcon sx={{ fontSize: 20 }} />}
            sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
          >
            {selectedReport ? tr('수정', 'Update') : tr('제출', 'Submit')}
          </Button>
        </DialogActions>
      </Dialog>

      {feedbackDialog}

      <ConfirmDialog
        open={dialogState.open}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        confirmColor={dialogState.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

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

export default WorkReport;
