import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, IconButton, Chip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, InputAdornment, Divider,
  Grid, LinearProgress
} from '@mui/material';
import {
  TrendingUp as OpportunityIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon, Download as DownloadIcon, Phone as PhoneIcon, Email as EmailIcon,
  Business as BusinessIcon, Person as PersonIcon, AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon, Description as DescriptionIcon, Star as StarIcon,
  CheckCircle as CheckIcon, Schedule as ScheduleIcon, Warning as WarningIcon
} from '@mui/icons-material';

interface SalesOpportunity {
  id: number;
  opportunityCode: string;
  opportunityName: string;
  customerName: string;
  customerContact: string;
  customerPhone: string;
  customerEmail: string;
  salesPerson: string;
  department: string;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability: number;
  estimatedValue: number;
  actualValue: number;
  expectedCloseDate: string;
  actualCloseDate?: string;
  source: string;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'on_hold' | 'cancelled';
  description: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const SalesOpportunity: React.FC = () => {
  const [opportunities, setOpportunities] = useState<SalesOpportunity[]>([
    {
      id: 1,
      opportunityCode: 'OPP-2024-001',
      opportunityName: 'ABC 기업 ERP 시스템 구축',
      customerName: 'ABC 기업',
      customerContact: '김대표',
      customerPhone: '02-1234-5678',
      customerEmail: 'ceo@abc.com',
      salesPerson: '이영업',
      department: '영업팀',
      stage: 'proposal',
      probability: 70,
      estimatedValue: 100000000,
      actualValue: 0,
      expectedCloseDate: '2024-03-15',
      source: '웹사이트 문의',
      priority: 'high',
      status: 'active',
      description: '전사 ERP 시스템 구축 프로젝트',
      notes: '경쟁사와 경쟁 중, 기술적 우위 보유',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-20'
    },
    {
      id: 2,
      opportunityCode: 'OPP-2024-002',
      opportunityName: 'XYZ 스타트업 CRM 도입',
      customerName: 'XYZ 스타트업',
      customerContact: '박CTO',
      customerPhone: '02-9876-5432',
      customerEmail: 'cto@xyz.com',
      salesPerson: '최영업',
      department: '영업팀',
      stage: 'negotiation',
      probability: 85,
      estimatedValue: 30000000,
      actualValue: 0,
      expectedCloseDate: '2024-02-28',
      source: '추천',
      priority: 'medium',
      status: 'active',
      description: '고객 관리 시스템 도입',
      notes: '계약 조건 협의 중',
      createdAt: '2024-01-10',
      updatedAt: '2024-01-22'
    },
    {
      id: 3,
      opportunityCode: 'OPP-2024-003',
      opportunityName: 'DEF 제조업 MES 시스템',
      customerName: 'DEF 제조업',
      customerContact: '이사장',
      customerPhone: '010-1111-2222',
      customerEmail: 'owner@def.com',
      salesPerson: '김영업',
      department: '영업팀',
      stage: 'closed_won',
      probability: 100,
      estimatedValue: 50000000,
      actualValue: 50000000,
      expectedCloseDate: '2024-01-30',
      actualCloseDate: '2024-01-25',
      source: '전시회',
      priority: 'high',
      status: 'active',
      description: '제조 실행 시스템 구축',
      notes: '계약 완료, 프로젝트 시작 예정',
      createdAt: '2023-12-01',
      updatedAt: '2024-01-25'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<SalesOpportunity | null>(null);
  const [formData, setFormData] = useState<Omit<SalesOpportunity, 'id' | 'createdAt' | 'updatedAt'>>({
    opportunityCode: '',
    opportunityName: '',
    customerName: '',
    customerContact: '',
    customerPhone: '',
    customerEmail: '',
    salesPerson: '',
    department: '',
    stage: 'prospecting',
    probability: 0,
    estimatedValue: 0,
    actualValue: 0,
    expectedCloseDate: '',
    actualCloseDate: '',
    source: '',
    priority: 'medium',
    status: 'active',
    description: '',
    notes: ''
  });

  const handleAdd = () => {
    setSelectedOpportunity(null);
    setFormData({
      opportunityCode: `OPP-${new Date().getFullYear()}-${String(opportunities.length + 1).padStart(3, '0')}`,
      opportunityName: '',
      customerName: '',
      customerContact: '',
      customerPhone: '',
      customerEmail: '',
      salesPerson: '',
      department: '',
      stage: 'prospecting',
      probability: 0,
      estimatedValue: 0,
      actualValue: 0,
      expectedCloseDate: '',
      actualCloseDate: '',
      source: '',
      priority: 'medium',
      status: 'active',
      description: '',
      notes: ''
    });
    setOpenDialog(true);
  };

  const handleEdit = (opportunity: SalesOpportunity) => {
    setSelectedOpportunity(opportunity);
    setFormData(opportunity);
    setOpenDialog(true);
  };

  const handleSave = () => {
    if (selectedOpportunity) {
      setOpportunities(opportunities.map(opportunity =>
        opportunity.id === selectedOpportunity.id 
          ? { ...opportunity, ...formData, updatedAt: new Date().toISOString().split('T')[0] }
          : opportunity
      ));
    } else {
      const newOpportunity: SalesOpportunity = {
        id: opportunities.length > 0 ? Math.max(...opportunities.map(o => o.id)) + 1 : 1,
        ...formData,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      };
      setOpportunities([...opportunities, newOpportunity]);
    }
    setOpenDialog(false);
  };

  const handleDelete = (id: number) => {
    setOpportunities(opportunities.filter(opportunity => opportunity.id !== id));
  };

  const getStageChip = (stage: string) => {
    const stageConfig = {
      prospecting: { label: '영업기회 발굴', color: 'default' as const },
      qualification: { label: '자격 검토', color: 'info' as const },
      proposal: { label: '제안서 제출', color: 'primary' as const },
      negotiation: { label: '협상', color: 'warning' as const },
      closed_won: { label: '성사', color: 'success' as const },
      closed_lost: { label: '실패', color: 'error' as const }
    };
    const config = stageConfig[stage as keyof typeof stageConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getPriorityChip = (priority: string) => {
    const priorityConfig = {
      high: { label: '높음', color: 'error' as const },
      medium: { label: '보통', color: 'warning' as const },
      low: { label: '낮음', color: 'info' as const }
    };
    const config = priorityConfig[priority as keyof typeof priorityConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      active: { label: '활성', color: 'success' as const },
      on_hold: { label: '보류', color: 'warning' as const },
      cancelled: { label: '취소', color: 'error' as const }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'prospecting': return <SearchIcon sx={{ color: 'text.secondary' }} />;
      case 'qualification': return <CheckIcon sx={{ color: 'info.main' }} />;
      case 'proposal': return <DescriptionIcon sx={{ color: 'primary.main' }} />;
      case 'negotiation': return <MoneyIcon sx={{ color: 'warning.main' }} />;
      case 'closed_won': return <CheckIcon sx={{ color: 'success.main' }} />;
      case 'closed_lost': return <WarningIcon sx={{ color: 'error.main' }} />;
      default: return null;
    }
  };

  const filteredOpportunities = opportunities.filter(opportunity => {
    const matchesSearch = opportunity.opportunityCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          opportunity.opportunityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          opportunity.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          opportunity.salesPerson.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === 'all' || opportunity.stage === stageFilter;
    const matchesPriority = priorityFilter === 'all' || opportunity.priority === priorityFilter;
    const matchesStatus = statusFilter === 'all' || opportunity.status === statusFilter;
    return matchesSearch && matchesStage && matchesPriority && matchesStatus;
  });

  const totalOpportunities = opportunities.length;
  const activeOpportunities = opportunities.filter(opp => opp.status === 'active').length;
  const totalEstimatedValue = opportunities.reduce((sum, opp) => sum + opp.estimatedValue, 0);
  const totalActualValue = opportunities.reduce((sum, opp) => sum + opp.actualValue, 0);
  const closedWonCount = opportunities.filter(opp => opp.stage === 'closed_won').length;
  const winRate = totalOpportunities > 0 ? Math.round((closedWonCount / totalOpportunities) * 100) : 0;

  return (
    <Box sx={{ width: '100%', px: 2, py: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <OpportunityIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          영업기회 관리
        </Typography>
      </Box>

      {/* 영업기회 요약 카드 */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, 
        gap: 3, 
        mb: 3 
      }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <OpportunityIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">총 기회</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {totalOpportunities}개
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CheckIcon sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h6">활성 기회</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
              {activeOpportunities}개
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <MoneyIcon sx={{ mr: 1, color: 'info.main' }} />
              <Typography variant="h6">예상 매출</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
              {totalEstimatedValue.toLocaleString()}원
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <StarIcon sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h6">성사율</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
              {winRate}%
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="기회코드, 기회명, 고객명, 담당자로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>단계</InputLabel>
              <Select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
              >
                <MenuItem value="all">전체 단계</MenuItem>
                <MenuItem value="prospecting">영업기회 발굴</MenuItem>
                <MenuItem value="qualification">자격 검토</MenuItem>
                <MenuItem value="proposal">제안서 제출</MenuItem>
                <MenuItem value="negotiation">협상</MenuItem>
                <MenuItem value="closed_won">성사</MenuItem>
                <MenuItem value="closed_lost">실패</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>우선순위</InputLabel>
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <MenuItem value="all">전체 우선순위</MenuItem>
                <MenuItem value="high">높음</MenuItem>
                <MenuItem value="medium">보통</MenuItem>
                <MenuItem value="low">낮음</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">전체 상태</MenuItem>
                <MenuItem value="active">활성</MenuItem>
                <MenuItem value="on_hold">보류</MenuItem>
                <MenuItem value="cancelled">취소</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="outlined" startIcon={<DownloadIcon />} sx={{ mr: 1 }}>
              내보내기
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
              영업기회 추가
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 영업기회 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>기회 정보</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>고객 정보</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>담당자</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>단계</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>예상 금액</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>성공 확률</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>예상 완료일</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>우선순위</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOpportunities.map((opportunity) => (
                <TableRow key={opportunity.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {opportunity.opportunityCode}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {opportunity.opportunityName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {opportunity.source}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <BusinessIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {opportunity.customerName}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <PersonIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {opportunity.customerContact}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PhoneIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {opportunity.customerPhone}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {opportunity.salesPerson}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {opportunity.department}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStageIcon(opportunity.stage)}
                      {getStageChip(opportunity.stage)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {opportunity.estimatedValue.toLocaleString()}원
                      </Typography>
                      {opportunity.actualValue > 0 && (
                        <Typography variant="caption" color="success.main">
                          실제: {opportunity.actualValue.toLocaleString()}원
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ minWidth: 30 }}>
                        {opportunity.probability}%
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={opportunity.probability} 
                        sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                        color={opportunity.probability >= 80 ? 'success' : opportunity.probability >= 50 ? 'warning' : 'error'}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CalendarIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {opportunity.expectedCloseDate}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {getPriorityChip(opportunity.priority)}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <IconButton size="small" onClick={() => handleEdit(opportunity)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(opportunity.id)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* 영업기회 추가/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedOpportunity ? '영업기회 수정' : '새 영업기회 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="기회 코드"
                value={formData.opportunityCode}
                onChange={(e) => setFormData({...formData, opportunityCode: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="기회명"
                value={formData.opportunityName}
                onChange={(e) => setFormData({...formData, opportunityName: e.target.value})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="고객명"
                value={formData.customerName}
                onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="고객 담당자"
                value={formData.customerContact}
                onChange={(e) => setFormData({...formData, customerContact: e.target.value})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="고객 전화번호"
                value={formData.customerPhone}
                onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="고객 이메일"
                value={formData.customerEmail}
                onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="영업 담당자"
                value={formData.salesPerson}
                onChange={(e) => setFormData({...formData, salesPerson: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="부서"
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>단계</InputLabel>
                <Select
                  value={formData.stage}
                  onChange={(e) => setFormData({...formData, stage: e.target.value as any})}
                >
                  <MenuItem value="prospecting">영업기회 발굴</MenuItem>
                  <MenuItem value="qualification">자격 검토</MenuItem>
                  <MenuItem value="proposal">제안서 제출</MenuItem>
                  <MenuItem value="negotiation">협상</MenuItem>
                  <MenuItem value="closed_won">성사</MenuItem>
                  <MenuItem value="closed_lost">실패</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="성공 확률 (%)"
                type="number"
                value={formData.probability}
                onChange={(e) => setFormData({...formData, probability: parseInt(e.target.value) || 0})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="예상 금액 (원)"
                type="number"
                value={formData.estimatedValue}
                onChange={(e) => setFormData({...formData, estimatedValue: parseInt(e.target.value) || 0})}
                required
              />
              <TextField
                fullWidth
                label="실제 금액 (원)"
                type="number"
                value={formData.actualValue}
                onChange={(e) => setFormData({...formData, actualValue: parseInt(e.target.value) || 0})}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="예상 완료일"
                type="date"
                value={formData.expectedCloseDate}
                onChange={(e) => setFormData({...formData, expectedCloseDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                fullWidth
                label="실제 완료일"
                type="date"
                value={formData.actualCloseDate}
                onChange={(e) => setFormData({...formData, actualCloseDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="영업 기회 출처"
                value={formData.source}
                onChange={(e) => setFormData({...formData, source: e.target.value})}
                required
              />
              <FormControl fullWidth>
                <InputLabel>우선순위</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                >
                  <MenuItem value="high">높음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="low">낮음</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <FormControl fullWidth>
              <InputLabel>상태</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as any})}
              >
                <MenuItem value="active">활성</MenuItem>
                <MenuItem value="on_hold">보류</MenuItem>
                <MenuItem value="cancelled">취소</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="기회 설명"
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
            <TextField
              fullWidth
              label="비고"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button onClick={handleSave} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesOpportunity;
