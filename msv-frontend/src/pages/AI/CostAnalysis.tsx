import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AttachMoney as AttachMoneyIcon,
  Assessment as AssessmentIcon,
  Lightbulb as LightbulbIcon,
  Psychology as PsychologyIcon,
  AutoAwesome as AutoAwesomeIcon,
  Insights as InsightsIcon,
  Analytics as AnalyticsIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  Compare as CompareIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ComposedChart, Area, PieChart, Pie, Cell } from 'recharts';
import { useStore } from '../../store';
import { api } from '../../services/api';

// TabPanel 컴포넌트 정의
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// AI 인사이트 타입 정의
interface AIInsight {
  id: string;
  type: 'cost_optimization' | 'workflow_improvement' | 'risk_alert' | 'efficiency_gain' | 'sustainability';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  data: any;
  createdAt: string;
  status: 'new' | 'reviewed' | 'implemented' | 'dismissed';
  priority: number;
  category: string;
  tags: string[];
  estimatedSavings?: number;
  implementationEffort?: 'low' | 'medium' | 'high';
  timeline?: string;
}

// 비용 분석 데이터 타입
interface CostAnalysisData {
  totalCost: number;
  monthlyTrend: Array<{
    month: string;
    cost: number;
    budget: number;
    variance: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
    color: string;
  }>;
  departmentCosts: Array<{
    department: string;
    cost: number;
    budget: number;
    efficiency: number;
  }>;
  costDrivers: Array<{
    driver: string;
    impact: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    recommendation: string;
  }>;
  aiInsights: AIInsight[];
  predictions: Array<{
    period: string;
    predictedCost: number;
    confidence: number;
    factors: string[];
  }>;
  benchmarks: Array<{
    metric: string;
    current: number;
    industry: number;
    best: number;
    unit: string;
  }>;
}

const CostAnalysis: React.FC = () => {
  const { user } = useStore();
  const [analysisData, setAnalysisData] = useState<CostAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  const [openInsightDialog, setOpenInsightDialog] = useState(false);
  const [timeRange, setTimeRange] = useState('6months');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [aiProcessing, setAiProcessing] = useState(false);

  // 데이터 로드
  useEffect(() => {
    const fetchAnalysisData = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/ai/cost-analysis?range=${timeRange}&category=${selectedCategory}`);
        if (response.data.success) {
          setAnalysisData(response.data.data);
        }
      } catch (error) {
        console.error('비용 분석 데이터 로드 오류:', error);
        setError('비용 분석 데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysisData();
  }, [timeRange, selectedCategory]);

  // AI 인사이트 생성
  const generateAIInsights = async () => {
    setAiProcessing(true);
    try {
      const response = await api.post('/ai/generate-insights', {
        type: 'cost_analysis',
        data: analysisData
      });
      
      if (response.data.success) {
        setAnalysisData(prev => prev ? {
          ...prev,
          aiInsights: [...prev.aiInsights, ...response.data.data.insights]
        } : null);
      }
    } catch (error) {
      console.error('AI 인사이트 생성 오류:', error);
      setError('AI 인사이트 생성에 실패했습니다.');
    } finally {
      setAiProcessing(false);
    }
  };

  // 인사이트 상태 업데이트
  const handleInsightStatusUpdate = async (insightId: string, status: string) => {
    try {
      await api.put(`/ai/insights/${insightId}/status`, { status });
      setAnalysisData(prev => prev ? {
        ...prev,
        aiInsights: prev.aiInsights.map(insight => 
          insight.id === insightId ? { ...insight, status: status as any } : insight
        )
      } : null);
    } catch (error) {
      console.error('인사이트 상태 업데이트 오류:', error);
    }
  };

  // 인사이트 상세 보기
  const handleInsightView = (insight: AIInsight) => {
    setSelectedInsight(insight);
    setOpenInsightDialog(true);
  };

  // 색상 팔레트
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff6b6b', '#4ecdc4', '#45b7d1'];

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>AI 분석 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PsychologyIcon color="primary" />
        AI 비용 분석
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        AI 기반 비용 최적화 제안과 예측 분석을 제공합니다.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* 필터 및 액션 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>기간</InputLabel>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value="1month">1개월</MenuItem>
                <MenuItem value="3months">3개월</MenuItem>
                <MenuItem value="6months">6개월</MenuItem>
                <MenuItem value="1year">1년</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>카테고리</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="operational">운영비</MenuItem>
                <MenuItem value="personnel">인사비</MenuItem>
                <MenuItem value="technology">기술비</MenuItem>
                <MenuItem value="marketing">마케팅비</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<AutoAwesomeIcon />}
              onClick={generateAIInsights}
              disabled={aiProcessing}
              size="small"
            >
              {aiProcessing ? 'AI 분석 중...' : 'AI 인사이트 생성'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              size="small"
            >
              보고서 다운로드
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 탭 네비게이션 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="개요" icon={<AnalyticsIcon />} />
          <Tab label="AI 인사이트" icon={<PsychologyIcon />} />
          <Tab label="예측 분석" icon={<TimelineIcon />} />
          <Tab label="벤치마킹" icon={<CompareIcon />} />
        </Tabs>
      </Box>

      {/* 개요 탭 */}
      <TabPanel value={activeTab} index={0}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
          {/* 총 비용 카드 */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachMoneyIcon color="primary" />
                총 비용
              </Typography>
              <Typography variant="h4" color="primary.main">
                ₩{analysisData?.totalCost?.toLocaleString() || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                현재 기간 기준
              </Typography>
            </CardContent>
          </Card>

          {/* 월별 트렌드 */}
          <Card sx={{ gridColumn: 'span 2' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon color="primary" />
                월별 비용 트렌드
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={analysisData?.monthlyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip />
                  <Area type="monotone" dataKey="cost" fill="#8884d8" fillOpacity={0.3} />
                  <Line type="monotone" dataKey="budget" stroke="#82ca9d" strokeWidth={2} />
                  <Line type="monotone" dataKey="cost" stroke="#8884d8" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 카테고리별 분석 */}
          <Card sx={{ gridColumn: 'span 2' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssessmentIcon color="primary" />
                카테고리별 비용 분석
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analysisData?.categoryBreakdown || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="amount"
                    label={({ category, percentage }) => `${category} ${percentage}%`}
                  >
                    {(analysisData?.categoryBreakdown || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 부서별 비용 */}
          <Card sx={{ gridColumn: 'span 2' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SpeedIcon color="primary" />
                부서별 비용 효율성
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>부서</TableCell>
                      <TableCell align="right">비용</TableCell>
                      <TableCell align="right">예산</TableCell>
                      <TableCell align="right">효율성</TableCell>
                      <TableCell align="center">상태</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analysisData?.departmentCosts?.map((dept, index) => (
                      <TableRow key={index}>
                        <TableCell>{dept.department}</TableCell>
                        <TableCell align="right">₩{dept.cost.toLocaleString()}</TableCell>
                        <TableCell align="right">₩{dept.budget.toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={dept.efficiency} 
                              sx={{ width: 100, height: 8 }}
                            />
                            <Typography variant="body2">{dept.efficiency}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={dept.efficiency > 80 ? '우수' : dept.efficiency > 60 ? '양호' : '개선필요'}
                            size="small"
                            color={dept.efficiency > 80 ? 'success' : dept.efficiency > 60 ? 'warning' : 'error'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      </TabPanel>

      {/* AI 인사이트 탭 */}
      <TabPanel value={activeTab} index={1}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {analysisData?.aiInsights?.map((insight) => (
            <Card key={insight.id} sx={{ cursor: 'pointer' }} onClick={() => handleInsightView(insight)}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PsychologyIcon color="primary" />
                    <Typography variant="h6">{insight.title}</Typography>
                    <Chip
                      label={insight.type}
                      size="small"
                      color={insight.type === 'cost_optimization' ? 'success' : 'primary'}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={insight.impact}
                      size="small"
                      color={insight.impact === 'high' ? 'error' : insight.impact === 'medium' ? 'warning' : 'default'}
                    />
                    <Chip
                      label={`${insight.confidence}% 신뢰도`}
                      size="small"
                      color="info"
                    />
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {insight.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {insight.tags.map((tag, index) => (
                    <Chip key={index} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
                {insight.estimatedSavings && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                    <Typography variant="body2" color="success.dark">
                      <strong>예상 절약액:</strong> ₩{insight.estimatedSavings.toLocaleString()}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      </TabPanel>

      {/* 예측 분석 탭 */}
      <TabPanel value={activeTab} index={2}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimelineIcon color="primary" />
                비용 예측
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analysisData?.predictions || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="predictedCost" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InsightsIcon color="primary" />
                예측 요인
              </Typography>
              <List>
                {analysisData?.predictions?.map((prediction, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={prediction.period}
                      secondary={`₩${prediction.predictedCost.toLocaleString()} (신뢰도: ${prediction.confidence}%)`}
                    />
                    <Chip
                      label={prediction.factors.length} 
                      size="small" 
                      color="primary"
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>
      </TabPanel>

      {/* 벤치마킹 탭 */}
      <TabPanel value={activeTab} index={3}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
          {analysisData?.benchmarks?.map((benchmark, index) => (
            <Card key={index}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {benchmark.metric}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">현재</Typography>
                    <Typography variant="h6">{benchmark.current} {benchmark.unit}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">업계 평균</Typography>
                    <Typography variant="body2">{benchmark.industry} {benchmark.unit}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">최고 수준</Typography>
                    <Typography variant="body2">{benchmark.best} {benchmark.unit}</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(benchmark.current / benchmark.best) * 100}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </TabPanel>

      {/* 인사이트 상세 다이얼로그 */}
      <Dialog open={openInsightDialog} onClose={() => setOpenInsightDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PsychologyIcon color="primary" />
            {selectedInsight?.title}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedInsight && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body1">{selectedInsight.description}</Typography>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip label={selectedInsight.type} size="small" color="primary" />
                <Chip label={selectedInsight.impact} size="small" color="secondary" />
                <Chip label={`${selectedInsight.confidence}% 신뢰도`} size="small" color="info" />
              </Box>

              <Divider />

              <Typography variant="h6">추천 사항</Typography>
              <List>
                {selectedInsight.recommendations.map((recommendation, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <LightbulbIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={recommendation} />
                  </ListItem>
                ))}
              </List>

              {selectedInsight.estimatedSavings && (
                <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="h6" color="success.dark">
                    예상 절약액: ₩{selectedInsight.estimatedSavings.toLocaleString()}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInsightDialog(false)}>닫기</Button>
          <Button 
            onClick={() => handleInsightStatusUpdate(selectedInsight?.id || '', 'implemented')} 
            variant="contained"
            disabled={selectedInsight?.status === 'implemented'}
          >
            구현하기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CostAnalysis;