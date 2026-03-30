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
  Grid,
  Divider,
  Stack,
  CircularProgress,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Code as CodeIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Category as CategoryIcon,
  List as ListIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useStore } from '../../store';
import { api } from '../../services/api';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../../components/Common/ConfirmDialog';

interface CodeGroup {
  id: number;
  code: string;
  name: string;
  name_en?: string;
  description?: string;
  is_active: boolean;
  order: number;
  created_at?: string;
  updated_at?: string;
}

interface CodeValue {
  id: number;
  group_id: number;
  code: string;
  name: string;
  name_en?: string;
  value: string;
  description?: string;
  is_active: boolean;
  order: number;
  parent_id?: number;
  created_at?: string;
  updated_at?: string;
  children?: CodeValue[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const CodeManagement: React.FC = () => {
  const { user } = useStore();
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [codeGroups, setCodeGroups] = useState<CodeGroup[]>([]);
  const [codeValues, setCodeValues] = useState<CodeValue[]>([]);
  const [filteredCodeGroups, setFilteredCodeGroups] = useState<CodeGroup[]>([]);
  const [filteredCodeValues, setFilteredCodeValues] = useState<CodeValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<CodeGroup | null>(null);
  const [selectedValue, setSelectedValue] = useState<CodeValue | null>(null);
  const [openGroupDialog, setOpenGroupDialog] = useState(false);
  const [openValueDialog, setOpenValueDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [groupFormData, setGroupFormData] = useState({
    code: '',
    name: '',
    name_en: '',
    description: '',
    is_active: true,
    order: 0,
  });

  const [valueFormData, setValueFormData] = useState({
    code: '',
    name: '',
    name_en: '',
    value: '',
    description: '',
    is_active: true,
    order: 0,
    parent_id: undefined as number | undefined,
  });

  // 샘플 데이터
  const sampleCodeGroups: CodeGroup[] = [
    {
      id: 1,
      code: 'BUDGET_CATEGORY',
      name: '예산 카테고리',
      name_en: 'Budget Category',
      description: '예산 관리에서 사용하는 카테고리',
      is_active: true,
      order: 1,
    },
    {
      id: 2,
      code: 'ASSET_CATEGORY',
      name: '자산 카테고리',
      name_en: 'Asset Category',
      description: '자산 관리에서 사용하는 카테고리',
      is_active: true,
      order: 2,
    },
    {
      id: 3,
      code: 'EXPENSE_CATEGORY',
      name: '비용 카테고리',
      name_en: 'Expense Category',
      description: '회계 통계에서 사용하는 비용 카테고리',
      is_active: true,
      order: 3,
    },
    {
      id: 4,
      code: 'REVENUE_CATEGORY',
      name: '수익 카테고리',
      name_en: 'Revenue Category',
      description: '회계 통계에서 사용하는 수익 카테고리',
      is_active: true,
      order: 4,
    },
  ];

  const sampleCodeValues: CodeValue[] = [
    // 예산 카테고리
    { id: 1, group_id: 1, code: 'LABOR', name: '인건비', value: '인건비', is_active: true, order: 1 },
    { id: 2, group_id: 1, code: 'OPERATION', name: '운영비', value: '운영비', is_active: true, order: 2 },
    { id: 3, group_id: 1, code: 'MARKETING', name: '마케팅', value: '마케팅', is_active: true, order: 3 },
    { id: 4, group_id: 1, code: 'DEVELOPMENT', name: '개발비', value: '개발비', is_active: true, order: 4 },
    { id: 5, group_id: 1, code: 'OTHER', name: '기타', value: '기타', is_active: true, order: 5 },
    // 인건비 하위 카테고리
    { id: 6, group_id: 1, code: 'SALARY', name: '급여', value: '급여', parent_id: 1, is_active: true, order: 1 },
    { id: 7, group_id: 1, code: 'BONUS', name: '상여금', value: '상여금', parent_id: 1, is_active: true, order: 2 },
    { id: 8, group_id: 1, code: 'RETIREMENT', name: '퇴직금', value: '퇴직금', parent_id: 1, is_active: true, order: 3 },
    // 자산 카테고리
    { id: 9, group_id: 2, code: 'IT_EQUIPMENT', name: 'IT 장비', value: 'IT 장비', is_active: true, order: 1 },
    { id: 10, group_id: 2, code: 'OFFICE_SUPPLIES', name: '사무용품', value: '사무용품', is_active: true, order: 2 },
    { id: 11, group_id: 2, code: 'FURNITURE', name: '가구', value: '가구', is_active: true, order: 3 },
    { id: 12, group_id: 2, code: 'VEHICLE', name: '차량', value: '차량', is_active: true, order: 4 },
    // IT 장비 하위 카테고리
    { id: 13, group_id: 2, code: 'COMPUTER', name: '컴퓨터', value: '컴퓨터', parent_id: 9, is_active: true, order: 1 },
    { id: 14, group_id: 2, code: 'SERVER', name: '서버', value: '서버', parent_id: 9, is_active: true, order: 2 },
    { id: 15, group_id: 2, code: 'PRINTER', name: '프린터', value: '프린터', parent_id: 9, is_active: true, order: 3 },
  ];

  useEffect(() => {
    loadCodeGroups();
    loadCodeValues();
  }, []);

  useEffect(() => {
    filterCodeGroups();
  }, [codeGroups, searchTerm]);

  useEffect(() => {
    if (selectedGroup) {
      filterCodeValues();
    }
  }, [codeValues, selectedGroup]);

  const loadCodeGroups = async () => {
    setLoading(true);
    try {
      // TODO: 실제 API 호출로 변경
      await new Promise(resolve => setTimeout(resolve, 500));
      setCodeGroups(sampleCodeGroups);
    } catch (error) {
      console.error('코드 그룹 로드 오류:', error);
      setError('코드 그룹을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadCodeValues = async () => {
    try {
      // TODO: 실제 API 호출로 변경
      await new Promise(resolve => setTimeout(resolve, 500));
      setCodeValues(sampleCodeValues);
    } catch (error) {
      console.error('코드 값 로드 오류:', error);
      setError('코드 값을 불러오는데 실패했습니다.');
    }
  };

  const filterCodeGroups = () => {
    let filtered = codeGroups;

    if (searchTerm) {
      filtered = filtered.filter(group =>
        group.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.name_en?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredCodeGroups(filtered);
  };

  const filterCodeValues = () => {
    if (!selectedGroup) {
      setFilteredCodeValues([]);
      return;
    }

    let filtered = codeValues.filter(value => value.group_id === selectedGroup.id);

    // 부모 코드만 먼저 표시
    const parentValues = filtered.filter(v => !v.parent_id);
    const childValues = filtered.filter(v => v.parent_id);

    // 부모 코드에 자식 코드 연결
    const valuesWithChildren = parentValues.map(parent => ({
      ...parent,
      children: childValues.filter(child => child.parent_id === parent.id),
    }));

    setFilteredCodeValues(valuesWithChildren);
  };

  const handleCreateGroup = () => {
    setSelectedGroup(null);
    setGroupFormData({
      code: '',
      name: '',
      name_en: '',
      description: '',
      is_active: true,
      order: codeGroups.length + 1,
    });
    setOpenGroupDialog(true);
  };

  const handleEditGroup = (group: CodeGroup) => {
    setSelectedGroup(group);
    setGroupFormData({
      code: group.code,
      name: group.name,
      name_en: group.name_en || '',
      description: group.description || '',
      is_active: group.is_active,
      order: group.order,
    });
    setOpenGroupDialog(true);
  };

  const handleSaveGroup = async () => {
    try {
      if (!groupFormData.code || !groupFormData.name) {
        setError('코드와 이름은 필수 항목입니다.');
        return;
      }

      if (selectedGroup) {
        // 수정
        setCodeGroups(prev => prev.map(g => 
          g.id === selectedGroup.id 
            ? { ...g, ...groupFormData }
            : g
        ));
        setSuccess('코드 그룹이 수정되었습니다.');
      } else {
        // 생성
        const newGroup: CodeGroup = {
          id: Date.now(),
          ...groupFormData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setCodeGroups(prev => [...prev, newGroup]);
        setSuccess('코드 그룹이 생성되었습니다.');
      }

      setOpenGroupDialog(false);
      setSelectedGroup(null);
    } catch (error) {
      console.error('코드 그룹 저장 오류:', error);
      setError('코드 그룹 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteGroup = async (id: number) => {
    showConfirm(
      '정말로 이 코드 그룹을 삭제하시겠습니까? 관련된 모든 코드 값도 삭제됩니다.',
      async () => {
        try {
          setCodeGroups(prev => prev.filter(g => g.id !== id));
          setCodeValues(prev => prev.filter(v => v.group_id !== id));
          setSuccess('코드 그룹이 삭제되었습니다.');
        } catch (error) {
          console.error('삭제 오류:', error);
          setError('삭제 중 오류가 발생했습니다.');
        }
      },
      { confirmColor: 'error' }
    );
  };

  const handleCreateValue = () => {
    if (!selectedGroup) {
      setError('먼저 코드 그룹을 선택해주세요.');
      return;
    }

    setSelectedValue(null);
    setValueFormData({
      code: '',
      name: '',
      name_en: '',
      value: '',
      description: '',
      is_active: true,
      order: codeValues.filter(v => v.group_id === selectedGroup.id).length + 1,
      parent_id: undefined,
    });
    setOpenValueDialog(true);
  };

  const handleEditValue = (value: CodeValue) => {
    setSelectedValue(value);
    setValueFormData({
      code: value.code,
      name: value.name,
      name_en: value.name_en || '',
      value: value.value,
      description: value.description || '',
      is_active: value.is_active,
      order: value.order,
      parent_id: value.parent_id,
    });
    setOpenValueDialog(true);
  };

  const handleSaveValue = async () => {
    try {
      if (!valueFormData.code || !valueFormData.name || !valueFormData.value) {
        setError('코드, 이름, 값은 필수 항목입니다.');
        return;
      }

      if (!selectedGroup) {
        setError('코드 그룹을 선택해주세요.');
        return;
      }

      if (selectedValue) {
        // 수정
        setCodeValues(prev => prev.map(v => 
          v.id === selectedValue.id 
            ? { ...v, ...valueFormData, group_id: selectedGroup.id }
            : v
        ));
        setSuccess('코드 값이 수정되었습니다.');
      } else {
        // 생성
        const newValue: CodeValue = {
          id: Date.now(),
          group_id: selectedGroup.id,
          ...valueFormData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setCodeValues(prev => [...prev, newValue]);
        setSuccess('코드 값이 생성되었습니다.');
      }

      setOpenValueDialog(false);
      setSelectedValue(null);
    } catch (error) {
      console.error('코드 값 저장 오류:', error);
      setError('코드 값 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteValue = async (id: number) => {
    showConfirm(
      '정말로 이 코드 값을 삭제하시겠습니까?',
      async () => {
        try {
          setCodeValues(prev => prev.filter(v => v.id !== id));
          setSuccess('코드 값이 삭제되었습니다.');
        } catch (error) {
          console.error('삭제 오류:', error);
          setError('삭제 중 오류가 발생했습니다.');
        }
      },
      { confirmColor: 'error' }
    );
  };

  const getGroupCodeValues = (groupId: number) => {
    return codeValues.filter(v => v.group_id === groupId);
  };

  const paginatedGroups = filteredCodeGroups.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CodeIcon sx={{ fontSize: '16px !important', color: 'primary.main' }} />
            <Typography component="h1" sx={{
              fontSize: '16px !important',
              fontWeight: 600,
              color: 'text.primary',
              lineHeight: 1.5
            }}>
              코드 관리
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            시스템에서 사용하는 코드 그룹과 코드 값을 관리합니다.
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* 탭 섹션 */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab icon={<CategoryIcon />} iconPosition="start" label="코드 그룹" />
            <Tab icon={<ListIcon />} iconPosition="start" label="코드 값" />
          </Tabs>
        </Box>

        {/* 코드 그룹 탭 */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <TextField
                placeholder="코드 그룹 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                sx={{ width: 300 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateGroup}
              >
                코드 그룹 추가
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredCodeGroups.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  코드 그룹이 없습니다.
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>코드</TableCell>
                      <TableCell>이름 (한글)</TableCell>
                      <TableCell>이름 (영문)</TableCell>
                      <TableCell>설명</TableCell>
                      <TableCell>순서</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell align="center">작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedGroups.map((group) => (
                      <TableRow key={group.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {group.code}
                          </Typography>
                        </TableCell>
                        <TableCell>{group.name}</TableCell>
                        <TableCell>{group.name_en || '-'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {group.description || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>{group.order}</TableCell>
                        <TableCell>
                          <Chip
                            label={group.is_active ? '활성' : '비활성'}
                            color={group.is_active ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <Tooltip title="수정">
                              <IconButton size="small" onClick={() => handleEditGroup(group)}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="삭제">
                              <IconButton size="small" onClick={() => handleDeleteGroup(group.id)} color="error">
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
            )}

            {filteredCodeGroups.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={Math.ceil(filteredCodeGroups.length / itemsPerPage)}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* 코드 값 탭 */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>코드 그룹 선택</InputLabel>
                  <Select
                    value={selectedGroup?.id || ''}
                    label="코드 그룹 선택"
                    onChange={(e) => {
                      const group = codeGroups.find(g => g.id === e.target.value);
                      setSelectedGroup(group || null);
                    }}
                  >
                    <MenuItem value="">전체</MenuItem>
                    {codeGroups.map(group => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name} ({group.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateValue}
                  disabled={!selectedGroup}
                  fullWidth
                >
                  코드 값 추가
                </Button>
              </Grid>
            </Grid>

            {!selectedGroup ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  코드 그룹을 선택해주세요.
                </Typography>
              </Box>
            ) : filteredCodeValues.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  선택한 코드 그룹에 코드 값이 없습니다.
                </Typography>
              </Box>
            ) : (
              <Box>
                {filteredCodeValues.map((parentValue) => (
                  <Accordion key={parentValue.id} defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Typography variant="body1" fontWeight={500}>
                          {parentValue.name}
                        </Typography>
                        <Chip label={parentValue.code} size="small" variant="outlined" />
                        <Chip
                          label={parentValue.is_active ? '활성' : '비활성'}
                          color={parentValue.is_active ? 'success' : 'default'}
                          size="small"
                        />
                        <Box sx={{ flexGrow: 1 }} />
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="수정">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditValue(parentValue);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="삭제">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteValue(parentValue.id);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      {parentValue.children && parentValue.children.length > 0 ? (
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>코드</TableCell>
                                <TableCell>이름</TableCell>
                                <TableCell>값</TableCell>
                                <TableCell>순서</TableCell>
                                <TableCell>상태</TableCell>
                                <TableCell align="center">작업</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {parentValue.children.map((child) => (
                                <TableRow key={child.id}>
                                  <TableCell>{child.code}</TableCell>
                                  <TableCell>{child.name}</TableCell>
                                  <TableCell>{child.value}</TableCell>
                                  <TableCell>{child.order}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={child.is_active ? '활성' : '비활성'}
                                      color={child.is_active ? 'success' : 'default'}
                                      size="small"
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                      <Tooltip title="수정">
                                        <IconButton
                                          size="small"
                                          onClick={() => handleEditValue(child)}
                                        >
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="삭제">
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() => handleDeleteValue(child.id)}
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          하위 코드 값이 없습니다.
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}
          </Box>
        </TabPanel>
      </Card>

      {/* 코드 그룹 생성/수정 다이얼로그 */}
      <Dialog open={openGroupDialog} onClose={() => setOpenGroupDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedGroup ? '코드 그룹 수정' : '새 코드 그룹 생성'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="코드 *"
                  value={groupFormData.code}
                  onChange={(e) => setGroupFormData({ ...groupFormData, code: e.target.value.toUpperCase() })}
                  required
                  helperText="예: BUDGET_CATEGORY"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="이름 (한글) *"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="이름 (영문)"
                  value={groupFormData.name_en}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name_en: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="설명"
                  multiline
                  rows={3}
                  value={groupFormData.description}
                  onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="순서"
                  type="number"
                  value={groupFormData.order}
                  onChange={(e) => setGroupFormData({ ...groupFormData, order: parseInt(e.target.value) || 0 })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>상태</InputLabel>
                  <Select
                    value={groupFormData.is_active ? 'active' : 'inactive'}
                    label="상태"
                    onChange={(e) => setGroupFormData({ ...groupFormData, is_active: e.target.value === 'active' })}
                  >
                    <MenuItem value="active">활성</MenuItem>
                    <MenuItem value="inactive">비활성</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenGroupDialog(false);
            setSelectedGroup(null);
          }}>
            취소
          </Button>
          <Button variant="contained" onClick={handleSaveGroup}>
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 코드 값 생성/수정 다이얼로그 */}
      <Dialog open={openValueDialog} onClose={() => setOpenValueDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedValue ? '코드 값 수정' : '새 코드 값 생성'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="코드 *"
                  value={valueFormData.code}
                  onChange={(e) => setValueFormData({ ...valueFormData, code: e.target.value.toUpperCase() })}
                  required
                  helperText="예: LABOR, SALARY"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="이름 (한글) *"
                  value={valueFormData.name}
                  onChange={(e) => setValueFormData({ ...valueFormData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="이름 (영문)"
                  value={valueFormData.name_en}
                  onChange={(e) => setValueFormData({ ...valueFormData, name_en: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="값 *"
                  value={valueFormData.value}
                  onChange={(e) => setValueFormData({ ...valueFormData, value: e.target.value })}
                  required
                  helperText="실제로 사용되는 값"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>부모 코드 (선택사항)</InputLabel>
                  <Select
                    value={valueFormData.parent_id || ''}
                    label="부모 코드 (선택사항)"
                    onChange={(e) => setValueFormData({ ...valueFormData, parent_id: e.target.value ? Number(e.target.value) : undefined })}
                  >
                    <MenuItem value="">없음 (최상위 코드)</MenuItem>
                    {selectedGroup && getGroupCodeValues(selectedGroup.id)
                      .filter(v => !v.parent_id)
                      .map(value => (
                        <MenuItem key={value.id} value={value.id}>
                          {value.name} ({value.code})
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="설명"
                  multiline
                  rows={2}
                  value={valueFormData.description}
                  onChange={(e) => setValueFormData({ ...valueFormData, description: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="순서"
                  type="number"
                  value={valueFormData.order}
                  onChange={(e) => setValueFormData({ ...valueFormData, order: parseInt(e.target.value) || 0 })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>상태</InputLabel>
                  <Select
                    value={valueFormData.is_active ? 'active' : 'inactive'}
                    label="상태"
                    onChange={(e) => setValueFormData({ ...valueFormData, is_active: e.target.value === 'active' })}
                  >
                    <MenuItem value="active">활성</MenuItem>
                    <MenuItem value="inactive">비활성</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenValueDialog(false);
            setSelectedValue(null);
          }}>
            취소
          </Button>
          <Button variant="contained" onClick={handleSaveValue}>
            저장
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

      {/* 확인 다이얼로그 */}
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
    </Box>
  );
};

export default CodeManagement;

