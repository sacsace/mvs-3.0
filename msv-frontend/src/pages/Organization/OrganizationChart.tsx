import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
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
  Alert,
  Snackbar,
  Paper,
  Avatar,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Business as BusinessIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import ReactFlow, {
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  NodeTypes,
  MarkerType,
  BackgroundVariant,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '../../store';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import { mvsPageRootSx } from '../../theme/mvsLayout';
import { filterActiveCompanyUsers, useReferenceDataStore } from '../../store/referenceDataStore';

const orgHandleStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  border: '2px solid #94a3b8',
  background: '#fff',
  opacity: 0,
};

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
    width: 230,
    boxShadow: 3,
    borderRadius: 2,
    border: '2px solid',
    borderColor: 'primary.main',
    position: 'relative',
    '&:hover': {
      boxShadow: 6,
      transform: 'scale(1.02)',
      transition: 'all 0.2s ease-in-out'
    }
  }}>
    <Handle type="target" position={Position.Top} style={orgHandleStyle} />
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
    width: 230,
    boxShadow: 3,
    borderRadius: 2,
    border: '2px solid',
    borderColor: 'secondary.main',
    position: 'relative',
    '&:hover': {
      boxShadow: 6,
      transform: 'scale(1.02)',
      transition: 'all 0.2s ease-in-out'
    }
  }}>
    <Handle type="target" position={Position.Top} style={orgHandleStyle} />
    <Handle type="source" position={Position.Bottom} style={orgHandleStyle} />
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
    width: 280,
    boxShadow: 4,
    borderRadius: 3,
    border: '3px solid',
    borderColor: 'success.main',
    position: 'relative',
    '&:hover': {
      boxShadow: 8,
      transform: 'scale(1.02)',
      transition: 'all 0.2s ease-in-out'
    }
  }}>
    <Handle type="source" position={Position.Bottom} style={orgHandleStyle} />
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
  const { user } = useStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedNode, setSelectedNode] = useState<OrganizationNode | null>(null);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    department: '',
    email: '',
    phone: '',
    type: 'person' as 'person' | 'department' | 'company',
    managerId: ''
  });

  // DB에서 조직도 데이터 로드
  const loadOrganizationData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 회사 정보 가져오기
      const company = user?.company_id
        ? await useReferenceDataStore.getState().fetchCompanyById(Number(user.company_id))
        : null;

      const users = await useReferenceDataStore.getState().fetchUsers();
      
      // 활성 사용자만 필터링
      const activeUsers = users.filter((u: any) => u.status === 'active');
      
      // 부서별로 그룹화
      const departmentMap = new Map<string, any[]>();
      activeUsers.forEach((user: any) => {
        const dept = user.department || '미지정';
        if (!departmentMap.has(dept)) {
          departmentMap.set(dept, []);
        }
        departmentMap.get(dept)!.push(user);
      });
      
      const orgNodes: OrganizationNode[] = [];
      const orgEdges: Edge[] = [];

      // 피라미드 레이아웃: 하위(직원) 폭을 기준으로 부서·회사 위치 계산
      const PERSON_W = 230;
      const PERSON_GAP = 32;
      const DEPT_W = 230;
      const DEPT_GAP = 72;
      const COMPANY_W = 280;
      const COMPANY_Y = 24;
      const DEPT_Y = 250;
      const PERSON_Y = 470;

      const departments = Array.from(departmentMap.keys());
      const deptLayouts = departments.map((deptName) => {
        const deptUsers = departmentMap.get(deptName)!;
        const peopleRowWidth =
          deptUsers.length === 0
            ? DEPT_W
            : deptUsers.length * PERSON_W + Math.max(0, deptUsers.length - 1) * PERSON_GAP;
        const subtreeWidth = Math.max(DEPT_W, peopleRowWidth);
        return { deptName, deptUsers, subtreeWidth, peopleRowWidth };
      });

      const totalTreeWidth =
        deptLayouts.reduce((sum, d) => sum + d.subtreeWidth, 0) +
        Math.max(0, deptLayouts.length - 1) * DEPT_GAP;
      const treeCenterX = totalTreeWidth / 2;

      // 회사 노드 (트리 중앙)
      if (company) {
        orgNodes.push({
          id: `company-${company.id}`,
          type: 'company',
          data: {
            label: company.name,
            name: company.name,
            level: 0,
            employeeCount: activeUsers.length,
          },
          position: { x: treeCenterX - COMPANY_W / 2, y: COMPANY_Y },
        });
      }

      let cursorX = 0;
      deptLayouts.forEach(({ deptName, deptUsers, subtreeWidth, peopleRowWidth }) => {
        const deptNodeId = `dept-${deptName}`;
        const subtreeCenterX = cursorX + subtreeWidth / 2;
        const deptX = subtreeCenterX - DEPT_W / 2;

        orgNodes.push({
          id: deptNodeId,
          type: 'department',
          data: {
            label: deptName,
            name: deptName,
            level: 1,
            employeeCount: deptUsers.length,
          },
          position: { x: deptX, y: DEPT_Y },
        });

        if (company) {
          orgEdges.push({
            id: `edge-company-${deptNodeId}`,
            source: `company-${company.id}`,
            target: deptNodeId,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#94a3b8', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#94a3b8' },
          });
        }

        const personStartX = subtreeCenterX - peopleRowWidth / 2;
        deptUsers.forEach((userData, userIndex) => {
          const userId = `user-${userData.id}`;
          orgNodes.push({
            id: userId,
            type: 'person',
            data: {
              label: userData.username,
              name: userData.username,
              position: userData.position || '',
              department: userData.department || '',
              email: userData.email || '',
              phone: userData.phone || '',
              level: 2,
              managerId: deptNodeId,
            },
            position: {
              x: personStartX + userIndex * (PERSON_W + PERSON_GAP),
              y: PERSON_Y,
            },
          });

          orgEdges.push({
            id: `edge-${deptNodeId}-${userId}`,
            source: deptNodeId,
            target: userId,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#94a3b8', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#94a3b8' },
          });
        });

        cursorX += subtreeWidth + DEPT_GAP;
      });

      setNodes(orgNodes);
      setEdges(orgEdges);
    } catch (error: any) {
      console.error('❌ [조직도] 데이터 로드 오류:', error);
      console.error('❌ [조직도] 에러 상세:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      const errorMessage = error.response?.data?.message || error.message || '조직도 데이터를 불러오는데 실패했습니다.';
      setError(errorMessage);
      setNodes([]);
      setEdges([]);
    } finally {
      setLoading(false);
          }
  }, [user?.company_id]);

  // 초기 데이터 로드
  React.useEffect(() => {
    if (user?.company_id) {
      loadOrganizationData();
    }
  }, [loadOrganizationData, user?.company_id]);

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

  // 통계 계산
  const stats = useMemo(() => {
    const totalEmployees = nodes.filter(node => node.type === 'person').length;
    const totalDepartments = nodes.filter(node => node.type === 'department').length;
    const totalCompanies = nodes.filter(node => node.type === 'company').length;
    
    return { totalEmployees, totalDepartments, totalCompanies };
  }, [nodes]);

  return (
    <Box sx={{ ...mvsPageRootSx, height: 'calc(100vh - 200px)' }}>
      <MvsPageHeader
        title="조직도 관리"
        description="회사 조직 구조를 시각화하고 관리하는 페이지입니다."
        actions={
          <>
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
            onClick={loadOrganizationData}
            sx={{ borderRadius: 2 }}
            disabled={loading}
          >
            새로고침
          </Button>
          </>
        }
      />

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
      <Paper sx={{ height: 'calc(100vh - 400px)', minHeight: 500, borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
        {loading ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%' 
          }}>
            <Typography variant="h6" color="text.secondary">
              조직도 데이터를 불러오는 중...
            </Typography>
          </Box>
        ) : nodes.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            flexDirection: 'column',
            gap: 2
          }}>
            <Typography variant="h6" color="text.secondary">
              조직도 데이터가 없습니다.
            </Typography>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={loadOrganizationData}
            >
              새로고침
            </Button>
          </Box>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={{
              type: 'smoothstep',
              style: { stroke: '#94a3b8', strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#94a3b8' },
            }}
            fitView
            fitViewOptions={{ padding: 0.2 }}
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
        )}
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