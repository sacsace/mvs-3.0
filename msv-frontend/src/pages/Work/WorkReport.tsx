import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  Snackbar,
  Pagination,
  InputAdornment,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';
import { workReportService } from '../../services/api';
import { useTranslation } from 'react-i18next';

interface WorkReportItem {
  id: number;
  reportId: string;
  title: string;
  type: 'daily' | 'weekly' | 'monthly' | 'project' | 'incident' | 'other';
  category: string;
  authorId: number;
  authorName: string;
  authorDepartment: string;
  authorPosition: string;
  content: string;
  summary: string;
  achievements: string[];
  challenges: string[];
  nextSteps: string[];
  attachments: string[];
  status: 'draft' | 'submitted' | 'reviewed' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reportDate: string;
  dueDate?: string;
  reviewerId?: number;
  reviewerName?: string;
  reviewComment?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isPublic: boolean;
}

const WorkReport: React.FC = () => {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language.startsWith('en');
  const tr = (ko: string, en: string) => (isEnglish ? en : ko);

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
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState({
    title: '',
    type: 'daily' as WorkReportItem['type'],
    category: '',
    priority: 'medium' as WorkReportItem['priority'],
    reportDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    content: '',
    summary: '',
    achievements: '',
    challenges: '',
    nextSteps: '',
    tags: '',
    isPublic: false
  });

  const loadReportData = useCallback(async () => {
    setError('');
    try {
      const response = await workReportService.getWorkReports();
      if (response.success) {
        const reportsData: WorkReportItem[] = (response.data || []).map((r: any) => ({
          id: r.id,
          reportId: r.report_id || '',
          title: r.title || '',
          type: r.type || 'other',
          category: r.category || '',
          authorId: r.author_id,
          authorName: r.author?.username || tr('알 수 없음', 'Unknown'),
          authorDepartment: r.author?.department || '-',
          authorPosition: r.author?.position || '-',
          content: r.content || '',
          summary: r.summary || '',
          achievements: r.achievements ? JSON.parse(r.achievements) : [],
          challenges: r.challenges ? JSON.parse(r.challenges) : [],
          nextSteps: r.next_steps ? JSON.parse(r.next_steps) : [],
          attachments: r.attachments ? JSON.parse(r.attachments) : [],
          status: r.status || 'draft',
          priority: r.priority || 'medium',
          reportDate: r.report_date || new Date().toISOString().split('T')[0],
          dueDate: r.due_date,
          reviewerId: r.reviewer_id,
          reviewerName: r.reviewer?.username,
          reviewComment: r.review_comment,
          reviewedAt: r.reviewed_at,
          createdAt: r.created_at || new Date().toISOString(),
          updatedAt: r.updated_at || new Date().toISOString(),
          tags: r.tags ? JSON.parse(r.tags) : [],
          isPublic: r.is_public || false
        }));
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
  }, []);

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

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'draft':
        return <Chip label={tr('초안', 'Draft')} color="default" size="small" />;
      case 'submitted':
        return <Chip label={tr('제출됨', 'Submitted')} color="info" size="small" />;
      case 'reviewed':
        return <Chip label={tr('검토됨', 'Reviewed')} color="warning" size="small" />;
      case 'approved':
        return <Chip label={tr('승인됨', 'Approved')} color="success" size="small" />;
      case 'rejected':
        return <Chip label={tr('반려됨', 'Rejected')} color="error" size="small" />;
      default:
        return <Chip label={tr('알 수 없음', 'Unknown')} color="default" size="small" />;
    }
  };

  const getPriorityChip = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Chip label={tr('낮음', 'Low')} color="default" size="small" />;
      case 'medium':
        return <Chip label={tr('보통', 'Medium')} color="info" size="small" />;
      case 'high':
        return <Chip label={tr('높음', 'High')} color="warning" size="small" />;
      case 'urgent':
        return <Chip label={tr('긴급', 'Urgent')} color="error" size="small" />;
      default:
        return <Chip label={tr('알 수 없음', 'Unknown')} color="default" size="small" />;
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
    setSelectedReport(report);
    setViewMode('view');
  };

  const handleEditReport = (report: WorkReportItem) => {
    setSelectedReport(report);
    setFormState({
      title: report.title,
      type: report.type,
      category: report.category,
      priority: report.priority,
      reportDate: report.reportDate,
      dueDate: report.dueDate || '',
      content: report.content,
      summary: report.summary,
      achievements: report.achievements.join('\n'),
      challenges: report.challenges.join('\n'),
      nextSteps: report.nextSteps.join('\n'),
      tags: report.tags.join(', '),
      isPublic: report.isPublic
    });
    setOpenDialog(true);
  };

  const handleOpenCreate = () => {
    setSelectedReport(null);
    setFormState({
      title: '',
      type: 'daily',
      category: '',
      priority: 'medium',
      reportDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      content: '',
      summary: '',
      achievements: '',
      challenges: '',
      nextSteps: '',
      tags: '',
      isPublic: false
    });
    setOpenDialog(true);
  };

  const handleSaveReport = async () => {
    if (!formState.title.trim() || !formState.content.trim()) {
      setError(tr('제목과 내용을 입력해주세요.', 'Please enter title and content.'));
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

    const payload = {
      title: formState.title.trim(),
      type: formState.type,
      category: formState.category.trim(),
      priority: formState.priority,
      report_date: formState.reportDate,
      due_date: formState.dueDate || null,
      content: formState.content.trim(),
      summary: formState.summary.trim(),
      achievements: toList(formState.achievements),
      challenges: toList(formState.challenges),
      next_steps: toList(formState.nextSteps),
      tags,
      is_public: formState.isPublic,
      status: selectedReport?.status || 'draft'
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
            : tr('보고서가 작성되었습니다.', 'Report has been created.')
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

  const handleDeleteReport = async (id: number) => {
    if (window.confirm(tr('정말로 이 보고서를 삭제하시겠습니까?', 'Are you sure you want to delete this report?'))) {
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

  const handleRejectReport = async (id: number) => {
    const comment = window.prompt(tr('반려 사유를 입력하세요:', 'Enter rejection reason:'));
    if (comment !== null) {
      try {
        const response = await workReportService.reviewWorkReport(id, 'rejected', comment);
        if (response.success) {
          setSuccess(tr('보고서가 반려되었습니다.', 'Report rejected.'));
          loadReportData();
          if (viewMode === 'view' && selectedReport?.id === id) {
            setViewMode('list');
          }
        } else {
          setError(response.message || tr('보고서 반려에 실패했습니다.', 'Failed to reject report.'));
        }
      } catch (error: any) {
        console.error('보고서 반려 오류:', error);
        setError(error.response?.data?.message || tr('보고서 반려 중 오류가 발생했습니다.', 'An error occurred while rejecting report.'));
      }
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

  if (viewMode === 'view' && selectedReport) {
    return (
      <Box sx={{ 
        p: 3, 
        backgroundColor: 'workArea.main',
        borderRadius: 2,
        minHeight: '100%'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIcon />
            {tr('업무 보고서 상세', 'Work Report Detail')}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setViewMode('list')}
          >
            {tr('목록으로', 'Back to List')}
          </Button>
        </Box>

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
                  <Chip label={getTypeLabel(selectedReport.type)} color="primary" size="small" />
                  {selectedReport.isPublic && <Chip label={tr('공개', 'Public')} color="info" size="small" />}
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" color="text.secondary">
                  {tr('작성일', 'Report Date')}: {selectedReport.reportDate}
                </Typography>
                {selectedReport.dueDate && (
                  <Typography variant="body2" color="text.secondary">
                    {tr('마감일', 'Due Date')}: {selectedReport.dueDate}
                  </Typography>
                )}
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* 작성자 정보 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{tr('작성자 정보', 'Author Info')}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
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

            {/* 요약 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{tr('요약', 'Summary')}</Typography>
              <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body1">
                  {selectedReport.summary}
                </Typography>
              </Card>
            </Box>

            {/* 주요 성과 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{tr('주요 성과', 'Key Achievements')}</Typography>
              <List>
                {selectedReport.achievements.map((achievement, index) => (
                  <ListItem key={index}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'success.main', width: 32, height: 32 }}>
                        <CheckCircleIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={achievement} />
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* 도전과제 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{tr('도전과제', 'Challenges')}</Typography>
              <List>
                {selectedReport.challenges.map((challenge, index) => (
                  <ListItem key={index}>
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

            {/* 다음 단계 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{tr('다음 단계', 'Next Steps')}</Typography>
              <List>
                {selectedReport.nextSteps.map((step, index) => (
                  <ListItem key={index}>
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

            {/* 상세 내용 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{tr('상세 내용', 'Details')}</Typography>
              <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                  {selectedReport.content}
                </Typography>
              </Card>
            </Box>

            {/* 첨부파일 */}
            {selectedReport.attachments.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>{tr('첨부파일', 'Attachments')}</Typography>
                <List>
                  {selectedReport.attachments.map((file, index) => (
                    <ListItem key={index}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <AttachFileIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={file} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* 태그 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{tr('태그', 'Tags')}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedReport.tags.map((tag, index) => (
                  <Chip key={index} label={tag} variant="outlined" />
                ))}
              </Box>
            </Box>

            {/* 검토 정보 */}
            {selectedReport.reviewerName && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>{tr('검토 정보', 'Review Info')}</Typography>
                <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>{tr('검토자', 'Reviewer')}:</strong> {selectedReport.reviewerName}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>{tr('검토일', 'Reviewed At')}:</strong> {selectedReport.reviewedAt}
                  </Typography>
                  {selectedReport.reviewComment && (
                    <Typography variant="body1">
                      <strong>{tr('검토 의견', 'Review Comment')}:</strong> {selectedReport.reviewComment}
                    </Typography>
                  )}
                </Card>
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => handleEditReport(selectedReport)}
              >
                {tr('수정', 'Edit')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
              >
                {tr('인쇄', 'Print')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
              >
                {tr('PDF 다운로드', 'Download PDF')}
              </Button>
              {selectedReport.status === 'submitted' && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => handleApproveReport(selectedReport.id)}
                  >
                    {tr('승인', 'Approve')}
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => handleRejectReport(selectedReport.id)}
                  >
                    {tr('반려', 'Reject')}
                  </Button>
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: 'workArea.main',
      borderRadius: 2,
      minHeight: '100%'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon sx={{ fontSize: '16px !important', color: 'primary.main' }} />
          <Typography component="h1" sx={{ 
            fontSize: '16px !important',
            fontWeight: 600,
            color: 'text.primary',
            lineHeight: 1.5
          }}>
            {tr('업무 보고서', 'Work Reports')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ borderRadius: 2 }}
        >
          {tr('보고서 작성', 'Create Report')}
        </Button>
      </Box>

      {/* 통계 카드 */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2, 
        mb: 3 
      }}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              {tr('대기중인 보고서', 'Pending Reports')}
            </Typography>
            <Typography variant="h4" color="warning.main">
              {pendingCount}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              {tr('승인된 보고서', 'Approved Reports')}
            </Typography>
            <Typography variant="h4" color="success.main">
              {approvedCount}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              {tr('반려된 보고서', 'Rejected Reports')}
            </Typography>
            <Typography variant="h4" color="error.main">
              {rejectedCount}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              {tr('긴급 보고서', 'Urgent Reports')}
            </Typography>
            <Typography variant="h4" color="error.main">
              {urgentCount}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr 1fr' },
            gap: 2, 
            alignItems: 'center' 
          }}>
            <TextField
              fullWidth
              placeholder={tr('제목, 보고서번호, 작성자, 내용 검색', 'Search title, report no, author, content')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl fullWidth>
              <InputLabel>{tr('상태', 'Status')}</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">{tr('전체', 'All')}</MenuItem>
                <MenuItem value="draft">{tr('초안', 'Draft')}</MenuItem>
                <MenuItem value="submitted">{tr('제출됨', 'Submitted')}</MenuItem>
                <MenuItem value="reviewed">{tr('검토됨', 'Reviewed')}</MenuItem>
                <MenuItem value="approved">{tr('승인됨', 'Approved')}</MenuItem>
                <MenuItem value="rejected">{tr('반려됨', 'Rejected')}</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>{tr('유형', 'Type')}</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
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
            <FormControl fullWidth>
              <InputLabel>{tr('우선순위', 'Priority')}</InputLabel>
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
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
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setTypeFilter('');
                setPriorityFilter('');
              }}
            >
              {tr('초기화', 'Reset')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 보고서 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{tr('보고서 정보', 'Report')}</TableCell>
                <TableCell>{tr('작성자', 'Author')}</TableCell>
                <TableCell>{tr('유형', 'Type')}</TableCell>
                <TableCell>{tr('우선순위', 'Priority')}</TableCell>
                <TableCell>{tr('상태', 'Status')}</TableCell>
                <TableCell>{tr('작성일', 'Date')}</TableCell>
                <TableCell>{tr('작업', 'Actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedReports.map((report) => (
                <TableRow key={report.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {report.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {report.reportId}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
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
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                        <PersonIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {report.authorName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {report.authorDepartment}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={getTypeLabel(report.type)} color="primary" size="small" />
                  </TableCell>
                  <TableCell>{getPriorityChip(report.priority)}</TableCell>
                  <TableCell>{getStatusChip(report.status)}</TableCell>
                  <TableCell>{report.reportDate}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title={tr('보기', 'View')}>
                        <IconButton size="small" onClick={() => handleViewReport(report)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={tr('수정', 'Edit')}>
                        <IconButton size="small" onClick={() => handleEditReport(report)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {report.status === 'submitted' && (
                        <>
                          <Tooltip title={tr('승인', 'Approve')}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleApproveReport(report.id)}
                              color="success"
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={tr('반려', 'Reject')}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleRejectReport(report.id)}
                              color="error"
                            >
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title={tr('삭제', 'Delete')}>
                        <IconButton size="small" onClick={() => handleDeleteReport(report.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 페이지네이션 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <Pagination
            count={Math.ceil(filteredReports.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Card>

      {/* 보고서 작성/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedReport ? tr('보고서 수정', 'Edit Report') : tr('보고서 작성', 'Create Report')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
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
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
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
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                {tr('카테고리', 'Category')}
              </Typography>
              <TextField
                value={formState.category}
                onChange={(e) => setFormState((prev) => ({ ...prev, category: e.target.value }))}
                fullWidth
                placeholder={tr('카테고리를 입력하세요', 'Enter category')}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
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
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                {tr('작성일', 'Report Date')}
              </Typography>
              <TextField
                type="date"
                value={formState.reportDate}
                onChange={(e) => setFormState((prev) => ({ ...prev, reportDate: e.target.value }))}
                fullWidth
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                {tr('마감일', 'Due Date')}
              </Typography>
              <TextField
                type="date"
                value={formState.dueDate}
                onChange={(e) => setFormState((prev) => ({ ...prev, dueDate: e.target.value }))}
                fullWidth
              />
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1' } }}>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                {tr('내용', 'Content')} *
              </Typography>
              <TextField
                value={formState.content}
                onChange={(e) => setFormState((prev) => ({ ...prev, content: e.target.value }))}
                fullWidth
                multiline
                minRows={6}
                placeholder={tr('보고서 내용을 입력하세요', 'Enter report content')}
              />
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1' } }}>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                {tr('요약', 'Summary')}
              </Typography>
              <TextField
                value={formState.summary}
                onChange={(e) => setFormState((prev) => ({ ...prev, summary: e.target.value }))}
                fullWidth
                multiline
                minRows={2}
                placeholder={tr('요약을 입력하세요', 'Enter summary')}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                {tr('성과 (한 줄에 하나씩)', 'Achievements (one per line)')}
              </Typography>
              <TextField
                value={formState.achievements}
                onChange={(e) => setFormState((prev) => ({ ...prev, achievements: e.target.value }))}
                fullWidth
                multiline
                minRows={3}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
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
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
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
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
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
              control={
                <Checkbox
                  checked={formState.isPublic}
                  onChange={(e) => setFormState((prev) => ({ ...prev, isPublic: e.target.checked }))}
                />
              }
              label={tr('공개 보고서', 'Public report')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>{tr('취소', 'Cancel')}</Button>
          <Button variant="contained" onClick={handleSaveReport} disabled={saving}>
            {selectedReport ? tr('수정', 'Update') : tr('작성', 'Create')}
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
