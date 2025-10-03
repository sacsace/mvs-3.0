import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  Alert,
  Snackbar,
  Fab,
  Paper,
  Avatar,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Business as BusinessIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FitScreen as FitScreenIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  AccountTree as TreeIcon
} from '@mui/icons-material';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  NodeTypes,
  Position,
  MarkerType,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';

// 조직도 노드 타입 정의
interface OrganizationNode {
  id: string;
  type: 'person' | 'department' | 'company';
  data: {
    label: string;
    name: string;
    position?: string;
    department?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    employeeCount?: number;
    managerId?: string;
    level: number;
  };
  position: { x: number; y: number };
}

// 커스텀 노드 컴포넌트들
const PersonNode = ({ data }: { data: any }) => (
  <Card sx={{ 
    minWidth: 200, 
    maxWidth: 250,
    boxShadow: 3,
    borderRadius: 2,
    border: '2px solid',
    borderColor: 'primary.main',
    '&:hover': {
      boxShadow: 6,
      transform: 'scale(1.02)',
      transition: 'all 0.2s ease-in-out'
    }
  }}>
    <CardContent sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Avatar sx={{ mr: 1, bgcolor: 'primary.main' }}>
          <PersonIcon />
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold" noWrap>
            {data.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {data.position}
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ my: 1 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          📧 {data.email}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          📞 {data.phone}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

const DepartmentNode = ({ data }: { data: any }) => (
  <Card sx={{ 
    minWidth: 200, 
    maxWidth: 250,
    boxShadow: 3,
    borderRadius: 2,
    border: '2px solid',
    borderColor: 'secondary.main',
    '&:hover': {
      boxShadow: 6,
      transform: 'scale(1.02)',
      transition: 'all 0.2s ease-in-out'
    }
  }}>
    <CardContent sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Avatar sx={{ mr: 1, bgcolor: 'secondary.main' }}>
          <GroupIcon />
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold" noWrap>
            {data.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            부서
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ my: 1 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          직원 수
        </Typography>
        <Chip 
          label={data.employeeCount || 0} 
          size="small" 
          color="secondary" 
        />
      </Box>
    </CardContent>
  </Card>
);

const CompanyNode = ({ data }: { data: any }) => (
  <Card sx={{ 
    minWidth: 250, 
    maxWidth: 300,
    boxShadow: 4,
    borderRadius: 3,
    border: '3px solid',
    borderColor: 'success.main',
    '&:hover': {
      boxShadow: 8,
      transform: 'scale(1.02)',
      transition: 'all 0.2s ease-in-out'
    }
  }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Avatar sx={{ mr: 2, bgcolor: 'success.main', width: 48, height: 48 }}>
          <BusinessIcon />
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" fontWeight="bold" noWrap>
            {data.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            회사
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          총 직원 수
        </Typography>
        <Chip 
          label={data.employeeCount || 0} 
          color="success" 
          size="medium"
        />
      </Box>
    </CardContent>
  </Card>
);

// 노드 타입 정의
const nodeTypes: NodeTypes = {
  person: PersonNode,
  department: DepartmentNode,
  company: CompanyNode,
};

const OrganizationChart: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedNode, setSelectedNode] = useState<OrganizationNode | null>(null);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    department: '',
    email: '',
    phone: '',
    type: 'person' as 'person' | 'department' | 'company',
    managerId: ''
  });

  // 샘플 데이터
  const sampleData: OrganizationNode[] = [
    {
      id: '1',
      type: 'company',
      data: {
        label: 'MVS 3.0',
        name: 'MVS 3.0',
        level: 0,
        employeeCount: 25
      },
      position: { x: 400, y: 50 }
    },
    {
      id: '2',
      type: 'department',
      data: {
        label: '개발팀',
        name: '개발팀',
        level: 1,
        employeeCount: 8
      },
      position: { x: 200, y: 200 }
    },
    {
      id: '3',
      type: 'department',
      data: {
        label: '마케팅팀',
        name: '마케팅팀',
        level: 1,
        employeeCount: 5
      },
      position: { x: 600, y: 200 }
    },
    {
      id: '4',
      type: 'person',
      data: {
        label: '김개발',
        name: '김개발',
        position: '개발팀장',
        department: '개발팀',
        email: 'kim.dev@mvs.com',
        phone: '010-1234-5678',
        level: 2,
        managerId: '2'
      },
      position: { x: 100, y: 350 }
    },
    {
      id: '5',
      type: 'person',
      data: {
        label: '이프론트',
        name: '이프론트',
        position: '프론트엔드 개발자',
        department: '개발팀',
        email: 'lee.front@mvs.com',
        phone: '010-2345-6789',
        level: 2,
        managerId: '4'
      },
      position: { x: 50, y: 500 }
    },
    {
      id: '6',
      type: 'person',
      data: {
        label: '박백엔드',
        name: '박백엔드',
        position: '백엔드 개발자',
        department: '개발팀',
        email: 'park.back@mvs.com',
        phone: '010-3456-7890',
        level: 2,
        managerId: '4'
      },
      position: { x: 150, y: 500 }
    },
    {
      id: '7',
      type: 'person',
      data: {
        label: '최마케팅',
        name: '최마케팅',
        position: '마케팅팀장',
        department: '마케팅팀',
        email: 'choi.marketing@mvs.com',
        phone: '010-4567-8901',
        level: 2,
        managerId: '3'
      },
      position: { x: 500, y: 350 }
    },
    {
      id: '8',
      type: 'person',
      data: {
        label: '정디자인',
        name: '정디자인',
        position: 'UI/UX 디자이너',
        department: '마케팅팀',
        email: 'jung.design@mvs.com',
        phone: '010-5678-9012',
        level: 2,
        managerId: '7'
      },
      position: { x: 450, y: 500 }
    },
    {
      id: '9',
      type: 'person',
      data: {
        label: '한콘텐츠',
        name: '한콘텐츠',
        position: '콘텐츠 마케터',
        department: '마케팅팀',
        email: 'han.content@mvs.com',
        phone: '010-6789-0123',
        level: 2,
        managerId: '7'
      },
      position: { x: 550, y: 500 }
    }
  ];

  const sampleEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e1-3', source: '1', target: '3', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e2-4', source: '2', target: '4', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e4-5', source: '4', target: '5', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e4-6', source: '4', target: '6', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e3-7', source: '3', target: '7', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e7-8', source: '7', target: '8', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e7-9', source: '7', target: '9', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }
  ];

  // 초기 데이터 로드
  React.useEffect(() => {
    setNodes(sampleData);
    setEdges(sampleEdges);
  }, []);

  // 연결 생성
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // 노드 추가/수정 다이얼로그 열기
  const handleOpenDialog = (mode: 'add' | 'edit', node?: OrganizationNode) => {
    setDialogMode(mode);
    if (mode === 'edit' && node) {
      setSelectedNode(node);
      setFormData({
        name: node.data.name,
        position: node.data.position || '',
        department: node.data.department || '',
        email: node.data.email || '',
        phone: node.data.phone || '',
        type: node.type,
        managerId: node.data.managerId || ''
      });
    } else {
      setSelectedNode(null);
      setFormData({
        name: '',
        position: '',
        department: '',
        email: '',
        phone: '',
        type: 'person',
        managerId: ''
      });
    }
    setOpenDialog(true);
  };

  // 노드 저장
  const handleSaveNode = () => {
    if (!formData.name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    const newNode: OrganizationNode = {
      id: dialogMode === 'edit' && selectedNode ? selectedNode.id : Date.now().toString(),
      type: formData.type,
      data: {
        label: formData.name,
        name: formData.name,
        position: formData.position,
        department: formData.department,
        email: formData.email,
        phone: formData.phone,
        level: 2,
        managerId: formData.managerId
      },
      position: dialogMode === 'edit' && selectedNode 
        ? selectedNode.position 
        : { x: Math.random() * 400 + 100, y: Math.random() * 300 + 200 }
    };

    if (dialogMode === 'edit') {
      setNodes((nds) => nds.map((node) => (node.id === newNode.id ? newNode : node)));
    } else {
      setNodes((nds) => [...nds, newNode]);
    }

    setOpenDialog(false);
    setSuccess(dialogMode === 'edit' ? '노드가 수정되었습니다.' : '노드가 추가되었습니다.');
  };

  // 노드 삭제
  const handleDeleteNode = (nodeId: string) => {
    if (window.confirm('정말로 이 노드를 삭제하시겠습니까?')) {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      setSuccess('노드가 삭제되었습니다.');
    }
  };

  // 줌 컨트롤
  const handleZoomIn = () => {
    // ReactFlow의 줌 인 기능은 Controls 컴포넌트에서 처리됩니다
  };

  const handleZoomOut = () => {
    // ReactFlow의 줌 아웃 기능은 Controls 컴포넌트에서 처리됩니다
  };

  const handleFitView = () => {
    // ReactFlow의 fit view 기능은 Controls 컴포넌트에서 처리됩니다
  };

  // 통계 계산
  const stats = useMemo(() => {
    const totalEmployees = nodes.filter(node => node.type === 'person').length;
    const totalDepartments = nodes.filter(node => node.type === 'department').length;
    const totalCompanies = nodes.filter(node => node.type === 'company').length;
    
    return { totalEmployees, totalDepartments, totalCompanies };
  }, [nodes]);

  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: 'workArea.main',
      borderRadius: 2,
      minHeight: '100%',
      height: 'calc(100vh - 200px)'
    }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TreeIcon />
          조직도 관리
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('add')}
            sx={{ borderRadius: 2 }}
          >
            노드 추가
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              setNodes(sampleData);
              setEdges(sampleEdges);
            }}
            sx={{ borderRadius: 2 }}
          >
            초기화
          </Button>
        </Box>
      </Box>

      {/* 통계 카드 */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        gap: 2, 
        mb: 3 
      }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography color="textSecondary" gutterBottom>
              총 직원 수
            </Typography>
            <Typography variant="h4" color="primary.main">
              {stats.totalEmployees}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography color="textSecondary" gutterBottom>
              부서 수
            </Typography>
            <Typography variant="h4" color="secondary.main">
              {stats.totalDepartments}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography color="textSecondary" gutterBottom>
              회사 수
            </Typography>
            <Typography variant="h4" color="success.main">
              {stats.totalCompanies}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 조직도 다이어그램 */}
      <Paper sx={{ height: 'calc(100vh - 400px)', minHeight: 500, borderRadius: 2, overflow: 'hidden' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              switch (node.type) {
                case 'company': return '#22c55e';
                case 'department': return '#3b82f6';
                case 'person': return '#0d8aff';
                default: return '#64748b';
              }
            }}
            nodeStrokeWidth={3}
            nodeBorderRadius={8}
          />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>
      </Paper>

      {/* 노드 추가/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? '노드 추가' : '노드 수정'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="이름"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <FormControl fullWidth>
              <InputLabel>타입</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <MenuItem value="person">직원</MenuItem>
                <MenuItem value="department">부서</MenuItem>
                <MenuItem value="company">회사</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="직책"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              disabled={formData.type !== 'person'}
            />
            <TextField
              fullWidth
              label="부서"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              disabled={formData.type === 'company'}
            />
            <TextField
              fullWidth
              label="이메일"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={formData.type !== 'person'}
            />
            <TextField
              fullWidth
              label="전화번호"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={formData.type !== 'person'}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button onClick={handleSaveNode} variant="contained">
            {dialogMode === 'add' ? '추가' : '수정'}
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

export default OrganizationChart;