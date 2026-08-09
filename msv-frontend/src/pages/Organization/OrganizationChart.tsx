import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  Snackbar,
  Paper,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import ReactFlow, {
  Edge,
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
import { useReferenceDataStore } from '../../store/referenceDataStore';
import { positionService } from '../../services/api';

/** 직책명 폴백 순위 (낮을수록 상위). DB sort_order / position_id 우선 */
const POSITION_NAME_RANK: Record<string, number> = {
  대표이사: 1,
  대표: 1,
  ceo: 1,
  'chief executive officer': 1,
  부대표: 2,
  'vice president': 2,
  vp: 2,
  전무: 3,
  상무: 4,
  'executive director': 4,
  이사: 5,
  director: 5,
  부장: 6,
  차장: 7,
  과장: 8,
  manager: 8,
  대리: 9,
  'senior accountant': 9,
  'account executive': 9,
  주임: 10,
  사원: 11,
  staff: 11,
};

function normalizePositionName(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function getUserPositionRank(
  userData: any,
  rankByPositionId: Map<number, number>,
  rankByPositionName: Map<string, number>
): number {
  const positionId = userData?.position_id != null ? Number(userData.position_id) : NaN;
  if (Number.isFinite(positionId) && rankByPositionId.has(positionId)) {
    return rankByPositionId.get(positionId)!;
  }
  const rawName = String(userData?.position || '').trim();
  const normalized = normalizePositionName(rawName);
  if (rawName && rankByPositionName.has(rawName)) {
    return rankByPositionName.get(rawName)!;
  }
  if (normalized && rankByPositionName.has(normalized)) {
    return rankByPositionName.get(normalized)!;
  }
  if (normalized && POSITION_NAME_RANK[normalized] != null) {
    return POSITION_NAME_RANK[normalized];
  }
  return 999;
}

const orgHandleStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  border: '2px solid #94a3b8',
  background: '#fff',
  opacity: 0 };

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
    boxShadow: 'none',
    borderRadius: 1,
    border: '1px solid',
    borderColor: 'divider',
    borderTop: '3px solid',
    borderTopColor: 'primary.main',
    position: 'relative',
    transition: 'border-color 0.15s ease',
    '&:hover': {
      borderColor: 'primary.light',
      borderTopColor: 'primary.main'
    }
  }}>
    <Handle type="target" position={Position.Top} style={orgHandleStyle} />
    <Handle type="source" position={Position.Bottom} style={orgHandleStyle} />
    <CardContent sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Avatar sx={{ mr: 1, bgcolor: 'primary.main' }}>
          <PersonIcon />
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight="bold" noWrap>
            {data.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {data.position || '—'}
          </Typography>
          {data.department ? (
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {data.department}
            </Typography>
          ) : null}
        </Box>
      </Box>
      <Divider sx={{ my: 1 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary" noWrap>
          {data.email}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {data.phone}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

const CompanyNode = ({ data }: { data: any }) => (
  <Card sx={{ 
    width: 280,
    boxShadow: 'none',
    borderRadius: 1,
    border: '1px solid',
    borderColor: 'divider',
    borderTop: '3px solid',
    borderTopColor: 'success.main',
    position: 'relative',
    transition: 'border-color 0.15s ease',
    '&:hover': {
      borderColor: 'success.light',
      borderTopColor: 'success.main'
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

// 노드 타입 정의 — 사용자/회사 정보만 표시
const nodeTypes: NodeTypes = {
  person: PersonNode,
  company: CompanyNode,
};

const OrganizationChart: React.FC = () => {
  const { user } = useStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [departmentCount, setDepartmentCount] = useState(0);

  // DB에서 조직도 데이터 로드 (로그인한 사용자 소속 회사만)
  const loadOrganizationData = useCallback(async () => {
    try {
      setLoading(true);

      const myCompanyId =
        user?.company_id != null && Number.isFinite(Number(user.company_id))
          ? Number(user.company_id)
          : null;

      if (!myCompanyId) {
        setNodes([]);
        setEdges([]);
        setDepartmentCount(0);
        setError('소속 회사 정보가 없어 조직도를 표시할 수 없습니다.');
        return;
      }

      setError('');

      const company = await useReferenceDataStore.getState().fetchCompanyById(myCompanyId);

      // 사용자 관리에 등록된 활성 사용자만 표시 (내 회사)
      const [users, positionsRes] = await Promise.all([
        useReferenceDataStore.getState().fetchUsers({ company_id: myCompanyId }, true),
        positionService.list(false, myCompanyId).catch(() => ({ data: [] })),
      ]);

      const activeUsers = (Array.isArray(users) ? users : []).filter((u: any) => {
        if (u.status !== 'active') return false;
        const uidCompany = u.company_id != null ? Number(u.company_id) : null;
        return uidCompany == null || uidCompany === myCompanyId;
      });

      const uniqueDepartments = new Set(
        activeUsers
          .map((u: any) => String(u.department || '').trim())
          .filter((d: string) => d.length > 0)
      );
      setDepartmentCount(uniqueDepartments.size);

      const positions = Array.isArray(positionsRes?.data) ? positionsRes.data : [];
      const rankByPositionId = new Map<number, number>();
      const rankByPositionName = new Map<string, number>();
      positions.forEach((p: any) => {
        const order = Number(p.sort_order);
        const rank = Number.isFinite(order) ? order : 999;
        if (p.id != null) rankByPositionId.set(Number(p.id), rank);
        const name = String(p.name || '').trim();
        if (name) {
          rankByPositionName.set(name, rank);
          rankByPositionName.set(normalizePositionName(name), rank);
        }
      });

      // 직책 순위(상위 → 하위)별 그룹
      const rankGroups = new Map<number, any[]>();
      activeUsers.forEach((member: any) => {
        const rank = getUserPositionRank(member, rankByPositionId, rankByPositionName);
        if (!rankGroups.has(rank)) rankGroups.set(rank, []);
        rankGroups.get(rank)!.push(member);
      });

      const sortedRanks = Array.from(rankGroups.keys()).sort((a, b) => a - b);
      sortedRanks.forEach((rank) => {
        rankGroups.get(rank)!.sort((a, b) => {
          const deptCmp = String(a.department || '미지정').localeCompare(
            String(b.department || '미지정'),
            'ko'
          );
          if (deptCmp !== 0) return deptCmp;
          return String(a.username || '').localeCompare(String(b.username || ''), 'ko');
        });
      });

      const orgNodes: OrganizationNode[] = [];
      const orgEdges: Edge[] = [];

      // 직책 순위 세로 배치: 회사 → 상위 직책 행 → 하위 직책 행
      const PERSON_W = 230;
      const PERSON_GAP = 32;
      const COMPANY_W = 280;
      const COMPANY_Y = 24;
      const RANK_ROW_START_Y = 220;
      const RANK_ROW_STEP = 250;

      const rankLayouts = sortedRanks.map((rank) => {
        const rankUsers = rankGroups.get(rank)!;
        const peopleRowWidth =
          rankUsers.length * PERSON_W + Math.max(0, rankUsers.length - 1) * PERSON_GAP;
        return { rank, rankUsers, peopleRowWidth };
      });

      const maxRowWidth = Math.max(
        COMPANY_W,
        ...rankLayouts.map((r) => r.peopleRowWidth),
        PERSON_W
      );
      const treeCenterX = maxRowWidth / 2;
      const companyNodeId = company ? `company-${company.id}` : '';

      if (company) {
        orgNodes.push({
          id: companyNodeId,
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

      let previousRowIds: string[] = company ? [companyNodeId] : [];

      rankLayouts.forEach(({ rank, rankUsers, peopleRowWidth }, rankIndex) => {
        const rowY = RANK_ROW_START_Y + rankIndex * RANK_ROW_STEP;
        const personStartX = treeCenterX - peopleRowWidth / 2;
        const currentRowIds: string[] = [];

        rankUsers.forEach((userData, userIndex) => {
          const userId = `user-${userData.id}`;
          currentRowIds.push(userId);
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
              level: rankIndex + 1,
              managerId: previousRowIds[0] || companyNodeId,
            },
            position: {
              x: personStartX + userIndex * (PERSON_W + PERSON_GAP),
              y: rowY,
            },
          });

          // 직전 상위 행(회사 또는 상위 직책)에서 연결 — 줄 수를 줄이기 위해 상위 행 중앙 노드 위주
          const sourceId =
            previousRowIds[Math.min(userIndex, previousRowIds.length - 1)] || previousRowIds[0];
          if (sourceId) {
            orgEdges.push({
              id: `edge-${sourceId}-${userId}-r${rank}`,
              source: sourceId,
              target: userId,
              type: 'smoothstep',
              animated: false,
              style: { stroke: '#94a3b8', strokeWidth: 2 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 16,
                height: 16,
                color: '#94a3b8',
              },
            });
          }
        });

        previousRowIds = currentRowIds.length > 0 ? currentRowIds : previousRowIds;
      });

      setNodes(orgNodes);
      setEdges(orgEdges);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || '조직도 데이터를 불러오는데 실패했습니다.';
      setError(errorMessage);
      setNodes([]);
      setEdges([]);
      setDepartmentCount(0);
    } finally {
      setLoading(false);
    }
  }, [user?.company_id, setNodes, setEdges]);

  React.useEffect(() => {
    if (user?.company_id) {
      loadOrganizationData();
    }
  }, [loadOrganizationData, user?.company_id]);

  const stats = useMemo(() => {
    const totalEmployees = nodes.filter((node) => node.type === 'person').length;
    return { totalEmployees, totalDepartments: departmentCount };
  }, [nodes, departmentCount]);

  return (
    <Box sx={{ ...mvsPageRootSx, height: 'calc(100vh - 200px)' }}>
      <MvsPageHeader
        title="조직도 관리"
        description="사용자 관리에 등록된 직원·직책 정보를 기준으로 조직 구조를 표시합니다."
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadOrganizationData}
            sx={{ borderRadius: 2 }}
            disabled={loading}
          >
            새로고침
          </Button>
        }
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
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
      </Box>

      <Paper
        sx={{
          height: 'calc(100vh - 400px)',
          minHeight: 500,
          borderRadius: 2,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <Typography variant="h6" color="text.secondary">
              조직도 데이터를 불러오는 중...
            </Typography>
          </Box>
        ) : nodes.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <Typography variant="h6" color="text.secondary">
              표시할 사용자 정보가 없습니다.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              사용자 관리에서 직원·직책·부서를 등록한 뒤 새로고침해 주세요.
            </Typography>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={loadOrganizationData}>
              새로고침
            </Button>
          </Box>
        ) : (
          <ReactFlow
            key={`org-${nodes.length}-${edges.length}`}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            nodesConnectable={false}
            elementsSelectable
            nodesDraggable
            panOnDrag
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
                  case 'company':
                    return '#22c55e';
                  case 'person':
                    return '#0d8aff';
                  default:
                    return '#64748b';
                }
              }}
              nodeStrokeWidth={3}
              nodeBorderRadius={8}
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          </ReactFlow>
        )}
      </Paper>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OrganizationChart;