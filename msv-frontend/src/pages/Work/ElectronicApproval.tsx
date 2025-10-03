import React, { useState, useEffect } from 'react';
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
  Pagination,
  InputAdornment,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Badge
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
  Send as SendIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Comment as CommentIcon
} from '@mui/icons-material';
import { useStore } from '../../store';

interface ApprovalDocument {
  id: number;
  documentId: string;
  title: string;
  type: 'expense' | 'vacation' | 'purchase' | 'contract' | 'other';
  category: string;
  amount?: number;
  requesterId: number;
  requesterName: string;
  requesterDepartment: string;
  requesterPosition: string;
  description: string;
  attachments: string[];
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  currentApproverId?: number;
  currentApproverName?: string;
  approvalFlow: ApprovalStep[];
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  comments: ApprovalComment[];
}

interface ApprovalStep {
  id: number;
  stepOrder: number;
  approverId: number;
  approverName: string;
  approverDepartment: string;
  approverPosition: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  approvedAt?: string;
  comment?: string;
}

interface ApprovalComment {
  id: number;
  userId: number;
  userName: string;
  comment: string;
  createdAt: string;
  isInternal: boolean;
}

const ElectronicApproval: React.FC = () => {
  const { user } = useStore();
  const [documents, setDocuments] = useState<ApprovalDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<ApprovalDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ApprovalDocument | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // 샘플 데이터
  const sampleData: ApprovalDocument[] = [
    {
      id: 1,
      documentId: 'APP-2024-001',
      title: '개발팀 장비 구매 신청',
      type: 'purchase',
      category: 'IT 장비',
      amount: 5000000,
      requesterId: 1001,
      requesterName: '김개발',
      requesterDepartment: '개발팀',
      requesterPosition: '개발팀장',
      description: '개발팀 업무 효율성 향상을 위한 고성능 개발 장비 구매 신청',
      attachments: ['견적서.pdf', '제품사양서.pdf'],
      status: 'in_review',
      priority: 'high',
      currentApproverId: 2001,
      currentApproverName: '이부장',
      approvalFlow: [
        {
          id: 1,
          stepOrder: 1,
          approverId: 2001,
          approverName: '이부장',
          approverDepartment: 'IT부',
          approverPosition: '부장',
          status: 'approved',
          approvedAt: '2024-01-15 10:30:00',
          comment: '필요성 인정, 다음 단계로 진행'
        },
        {
          id: 2,
          stepOrder: 2,
          approverId: 3001,
          approverName: '박이사',
          approverDepartment: '경영진',
          approverPosition: '이사',
          status: 'pending'
        }
      ],
      createdAt: '2024-01-15 09:00:00',
      updatedAt: '2024-01-15 10:30:00',
      dueDate: '2024-01-20',
      comments: [
        {
          id: 1,
          userId: 2001,
          userName: '이부장',
          comment: '예산 범위 내에서 진행 가능합니다.',
          createdAt: '2024-01-15 10:30:00',
          isInternal: false
        }
      ]
    },
    {
      id: 2,
      documentId: 'APP-2024-002',
      title: '연차 사용 신청',
      type: 'vacation',
      category: '휴가',
      requesterId: 1002,
      requesterName: '이프론트',
      requesterDepartment: '개발팀',
      requesterPosition: '프론트엔드 개발자',
      description: '개인 사정으로 인한 연차 사용 신청 (2024-01-25 ~ 2024-01-26)',
      attachments: [],
      status: 'approved',
      priority: 'medium',
      approvalFlow: [
        {
          id: 3,
          stepOrder: 1,
          approverId: 1001,
          approverName: '김개발',
          approverDepartment: '개발팀',
          approverPosition: '개발팀장',
          status: 'approved',
          approvedAt: '2024-01-20 14:00:00',
          comment: '승인합니다. 즐거운 휴가 되세요.'
        }
      ],
      createdAt: '2024-01-20 13:30:00',
      updatedAt: '2024-01-20 14:00:00',
      dueDate: '2024-01-22',
      comments: []
    },
    {
      id: 3,
      documentId: 'APP-2024-003',
      title: '교육비 지출 신청',
      type: 'expense',
      category: '교육비',
      amount: 300000,
      requesterId: 1003,
      requesterName: '박백엔드',
      requesterDepartment: '개발팀',
      requesterPosition: '백엔드 개발자',
      description: 'AWS 클라우드 아키텍처 교육 과정 수강료 지출 신청',
      attachments: ['교육과정안내.pdf', '수강신청서.pdf'],
      status: 'submitted',
      priority: 'medium',
      currentApproverId: 1001,
      currentApproverName: '김개발',
      approvalFlow: [
        {
          id: 4,
          stepOrder: 1,
          approverId: 1001,
          approverName: '김개발',
          approverDepartment: '개발팀',
          approverPosition: '개발팀장',
          status: 'pending'
        }
      ],
      createdAt: '2024-01-22 11:00:00',
      updatedAt: '2024-01-22 11:00:00',
      dueDate: '2024-01-25',
      comments: []
    }
  ];

  useEffect(() => {
    loadApprovalData();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, statusFilter, typeFilter, priorityFilter]);

  const loadApprovalData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDocuments(sampleData);
    } catch (error) {
      console.error('결재 데이터 로드 오류:', error);
      setError('결재 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.documentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

    if (typeFilter) {
      filtered = filtered.filter(doc => doc.type === typeFilter);
    }

    if (priorityFilter) {
      filtered = filtered.filter(doc => doc.priority === priorityFilter);
    }

    setFilteredDocuments(filtered);
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'draft':
        return <Chip label="초안" color="default" size="small" />;
      case 'submitted':
        return <Chip label="제출됨" color="info" size="small" />;
      case 'in_review':
        return <Chip label="검토중" color="warning" size="small" />;
      case 'approved':
        return <Chip label="승인됨" color="success" size="small" />;
      case 'rejected':
        return <Chip label="반려됨" color="error" size="small" />;
      case 'cancelled':
        return <Chip label="취소됨" color="default" size="small" />;
      default:
        return <Chip label="알 수 없음" color="default" size="small" />;
    }
  };

  const getPriorityChip = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Chip label="낮음" color="default" size="small" />;
      case 'medium':
        return <Chip label="보통" color="info" size="small" />;
      case 'high':
        return <Chip label="높음" color="warning" size="small" />;
      case 'urgent':
        return <Chip label="긴급" color="error" size="small" />;
      default:
        return <Chip label="알 수 없음" color="default" size="small" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'expense':
        return '지출신청';
      case 'vacation':
        return '휴가신청';
      case 'purchase':
        return '구매신청';
      case 'contract':
        return '계약신청';
      case 'other':
        return '기타';
      default:
        return '알 수 없음';
    }
  };

  const handleViewDocument = (document: ApprovalDocument) => {
    setSelectedDocument(document);
    setViewMode('view');
  };

  const handleEditDocument = (document: ApprovalDocument) => {
    setSelectedDocument(document);
    setOpenDialog(true);
  };

  const handleDeleteDocument = async (id: number) => {
    if (window.confirm('정말로 이 결재 문서를 삭제하시겠습니까?')) {
      try {
        setDocuments(prev => prev.filter(doc => doc.id !== id));
        setSuccess('결재 문서가 성공적으로 삭제되었습니다.');
      } catch (error) {
        console.error('삭제 오류:', error);
        setError('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleApproveDocument = (id: number) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === id 
          ? { 
              ...doc, 
              status: 'approved' as const,
              updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
            } 
          : doc
      )
    );
    setSuccess('결재 문서가 승인되었습니다.');
  };

  const handleRejectDocument = (id: number) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === id 
          ? { 
              ...doc, 
              status: 'rejected' as const,
              updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
            } 
          : doc
      )
    );
    setSuccess('결재 문서가 반려되었습니다.');
  };

  const pendingCount = documents.filter(doc => doc.status === 'submitted' || doc.status === 'in_review').length;
  const approvedCount = documents.filter(doc => doc.status === 'approved').length;
  const rejectedCount = documents.filter(doc => doc.status === 'rejected').length;
  const totalAmount = documents
    .filter(doc => doc.amount && doc.status === 'approved')
    .reduce((sum, doc) => sum + (doc.amount || 0), 0);

  const paginatedDocuments = filteredDocuments.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  if (viewMode === 'view' && selectedDocument) {
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
            결재 문서 상세
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setViewMode('list')}
          >
            목록으로
          </Button>
        </Box>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {selectedDocument.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  문서번호: {selectedDocument.documentId}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {getStatusChip(selectedDocument.status)}
                  {getPriorityChip(selectedDocument.priority)}
                  <Chip label={getTypeLabel(selectedDocument.type)} color="primary" size="small" />
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                {selectedDocument.amount && (
                  <Typography variant="h4" color="primary.main">
                    ₩{selectedDocument.amount.toLocaleString()}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  신청일: {selectedDocument.createdAt}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* 신청자 정보 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>신청자 정보</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {selectedDocument.requesterName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedDocument.requesterPosition} • {selectedDocument.requesterDepartment}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* 문서 내용 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>문서 내용</Typography>
              <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body1" paragraph>
                  {selectedDocument.description}
                </Typography>
                {selectedDocument.attachments.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>첨부파일:</Typography>
                    <List dense>
                      {selectedDocument.attachments.map((file, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={file} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Card>
            </Box>

            {/* 결재 흐름 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>결재 흐름</Typography>
              <Stepper orientation="vertical">
                {selectedDocument.approvalFlow.map((step, index) => (
                  <Step key={step.id} active={step.status === 'pending'} completed={step.status === 'approved'}>
                    <StepLabel>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {step.approverName} ({step.approverPosition})
                        </Typography>
                        {step.status === 'approved' && <CheckCircleIcon color="success" />}
                        {step.status === 'rejected' && <CancelIcon color="error" />}
                        {step.status === 'pending' && <PendingIcon color="warning" />}
                      </Box>
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">
                        {step.approverDepartment}
                      </Typography>
                      {step.comment && (
                        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                          "{step.comment}"
                        </Typography>
                      )}
                      {step.approvedAt && (
                        <Typography variant="caption" color="text.secondary">
                          {step.approvedAt}
                        </Typography>
                      )}
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {/* 댓글 */}
            {selectedDocument.comments.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>댓글</Typography>
                <List>
                  {selectedDocument.comments.map((comment) => (
                    <ListItem key={comment.id}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <CommentIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={comment.userName}
                        secondary={
                          <Box>
                            <Typography variant="body2">{comment.comment}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {comment.createdAt}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => handleEditDocument(selectedDocument)}
              >
                수정
              </Button>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
              >
                인쇄
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
              >
                PDF 다운로드
              </Button>
              {selectedDocument.status === 'in_review' && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => handleApproveDocument(selectedDocument.id)}
                  >
                    승인
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => handleRejectDocument(selectedDocument.id)}
                  >
                    반려
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
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon />
          전자결재
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ borderRadius: 2 }}
        >
          결재 문서 작성
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
              대기중인 결재
            </Typography>
            <Typography variant="h4" color="warning.main">
              {pendingCount}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              승인된 결재
            </Typography>
            <Typography variant="h4" color="success.main">
              {approvedCount}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              반려된 결재
            </Typography>
            <Typography variant="h4" color="error.main">
              {rejectedCount}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              승인된 금액
            </Typography>
            <Typography variant="h4">
              ₩{totalAmount.toLocaleString()}
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
              placeholder="제목, 문서번호, 신청자 검색"
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
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="draft">초안</MenuItem>
                <MenuItem value="submitted">제출됨</MenuItem>
                <MenuItem value="in_review">검토중</MenuItem>
                <MenuItem value="approved">승인됨</MenuItem>
                <MenuItem value="rejected">반려됨</MenuItem>
                <MenuItem value="cancelled">취소됨</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>유형</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="expense">지출신청</MenuItem>
                <MenuItem value="vacation">휴가신청</MenuItem>
                <MenuItem value="purchase">구매신청</MenuItem>
                <MenuItem value="contract">계약신청</MenuItem>
                <MenuItem value="other">기타</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>우선순위</InputLabel>
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="low">낮음</MenuItem>
                <MenuItem value="medium">보통</MenuItem>
                <MenuItem value="high">높음</MenuItem>
                <MenuItem value="urgent">긴급</MenuItem>
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
              초기화
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 결재 문서 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>문서 정보</TableCell>
                <TableCell>신청자</TableCell>
                <TableCell>유형</TableCell>
                <TableCell>금액</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>우선순위</TableCell>
                <TableCell>신청일</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedDocuments.map((document) => (
                <TableRow key={document.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {document.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {document.documentId}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                        <PersonIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {document.requesterName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {document.requesterDepartment}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={getTypeLabel(document.type)} color="primary" size="small" />
                  </TableCell>
                  <TableCell>
                    {document.amount ? `₩${document.amount.toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell>{getStatusChip(document.status)}</TableCell>
                  <TableCell>{getPriorityChip(document.priority)}</TableCell>
                  <TableCell>{document.createdAt}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="보기">
                        <IconButton size="small" onClick={() => handleViewDocument(document)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="수정">
                        <IconButton size="small" onClick={() => handleEditDocument(document)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {document.status === 'in_review' && (
                        <>
                          <Tooltip title="승인">
                            <IconButton 
                              size="small" 
                              onClick={() => handleApproveDocument(document.id)}
                              color="success"
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="반려">
                            <IconButton 
                              size="small" 
                              onClick={() => handleRejectDocument(document.id)}
                              color="error"
                            >
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="삭제">
                        <IconButton size="small" onClick={() => handleDeleteDocument(document.id)}>
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
            count={Math.ceil(filteredDocuments.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Card>

      {/* 결재 문서 작성/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedDocument ? '결재 문서 수정' : '결재 문서 작성'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              결재 문서 정보를 입력해주세요.
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              결재 문서 작성 기능은 개발 중입니다.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained">
            {selectedDocument ? '수정' : '작성'}
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

export default ElectronicApproval;
