import React, { useState, useEffect, useCallback } from 'react';
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
import { useMenuStore } from '../../store';
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
      {value === index && <Box sx={{ px: { xs: 0, sm: 0.5 }, py: { xs: 2, sm: 2.5 } }}>{children}</Box>}
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
  const { language } = useMenuStore();
  const txt = useCallback((ko: string, en: string) => (language === 'en' ? en : ko), [language]);
  /** API는 0~1 소수 또는 이미 퍼센트 값을 줄 수 있음 */
  const formatConfidencePercent = useCallback((value: number) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    if (n > 0 && n <= 1) return Math.round(n * 100);
    return Math.round(Math.min(100, Math.max(0, n)));
  }, []);
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
        setError(
          language === 'en'
            ? 'Failed to load cost analysis data.'
            : '비용 분석 데이터를 불러오는데 실패했습니다.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysisData();
  }, [timeRange, selectedCategory, language]);

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
      setError(
        language === 'en' ? 'Failed to generate AI insights.' : 'AI 인사이트 생성에 실패했습니다.'
      );
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

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2, fontSize: '0.9375rem' }}>{txt('AI 분석 중...', 'Analyzing...')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1280, mx: 'auto' }}>
      <Typography
        variant="h5"
        component="h1"
        gutterBottom
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontWeight: 700,
          fontSize: { xs: '1.35rem', sm: '1.55rem' },
          letterSpacing: '-0.02em',
          '& .MuiSvgIcon-root': { fontSize: { xs: '1.35rem', sm: '1.5rem' } },
        }}
      >
        <PsychologyIcon color="primary" />
        {txt('AI 비용 분석', 'AI Cost Analysis')}
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 3, fontSize: '0.9375rem', lineHeight: 1.65, maxWidth: 720 }}
      >
        {txt(
          '최근 비용 추이와 카테고리별 지출을 분석하고, AI가 절감 포인트와 향후 비용을 예측합니다.',
          'Analyzes recent spending by category and uses AI to suggest savings and forecast costs.'
        )}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* 필터 및 액션 */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              flexWrap: 'wrap',
              '& .MuiInputLabel-root': { fontSize: '0.8125rem' },
              '& .MuiSelect-select': { fontSize: '0.875rem', fontWeight: 500, py: 1.1 },
            }}
          >
            <FormControl size="small" sx={{ minWidth: 128 }}>
              <InputLabel>{txt('기간', 'Period')}</InputLabel>
              <Select
                value={timeRange}
                label={txt('기간', 'Period')}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value="1month">{txt('1개월', '1 month')}</MenuItem>
                <MenuItem value="3months">{txt('3개월', '3 months')}</MenuItem>
                <MenuItem value="6months">{txt('6개월', '6 months')}</MenuItem>
                <MenuItem value="1year">{txt('1년', '1 year')}</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>{txt('카테고리', 'Category')}</InputLabel>
              <Select
                value={selectedCategory}
                label={txt('카테고리', 'Category')}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="all">{txt('전체', 'All')}</MenuItem>
                <MenuItem value="operational">{txt('운영비', 'Operational')}</MenuItem>
                <MenuItem value="personnel">{txt('인사비', 'Personnel')}</MenuItem>
                <MenuItem value="technology">{txt('기술비', 'Technology')}</MenuItem>
                <MenuItem value="marketing">{txt('마케팅비', 'Marketing')}</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<AutoAwesomeIcon />}
              onClick={generateAIInsights}
              disabled={aiProcessing}
              size="medium"
              sx={{ fontSize: '0.875rem', fontWeight: 600, px: 2, py: 1 }}
            >
              {aiProcessing ? txt('AI 분석 중...', 'Analyzing...') : txt('AI 인사이트 생성', 'Generate AI insights')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              size="medium"
              sx={{ fontSize: '0.875rem', fontWeight: 600, px: 2, py: 1 }}
            >
              {txt('보고서 다운로드', 'Download report')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 탭 네비게이션 */}
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 2.5,
          '& .MuiTab-root': {
            fontSize: '0.8125rem',
            fontWeight: 600,
            minHeight: 48,
            textTransform: 'none',
            letterSpacing: '0.02em',
          },
          '& .MuiTab-iconWrapper': { fontSize: '1.125rem' },
        }}
      >
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} variant="scrollable" allowScrollButtonsMobile>
          <Tab label={txt('개요', 'Overview')} icon={<AnalyticsIcon />} />
          <Tab label={txt('AI 인사이트', 'AI insights')} icon={<PsychologyIcon />} />
          <Tab label={txt('예측 분석', 'Forecast')} icon={<TimelineIcon />} />
          <Tab label={txt('벤치마킹', 'Benchmarks')} icon={<CompareIcon />} />
        </Tabs>
      </Box>

      {/* 개요 탭 */}
      <TabPanel value={activeTab} index={0}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
          {/* 총 비용 카드 */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1rem', fontWeight: 600 }}>
                <AttachMoneyIcon color="primary" />
                {txt('총 비용', 'Total cost')}
              </Typography>
              <Typography variant="h4" color="primary.main" sx={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Rs. {analysisData?.totalCost?.toLocaleString() || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', mt: 0.5 }}>
                {txt('현재 기간 기준', 'For the selected period')}
              </Typography>
            </CardContent>
          </Card>

          {/* 월별 트렌드 */}
          <Card sx={{ gridColumn: 'span 2' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1rem', fontWeight: 600 }}>
                <TrendingUpIcon color="primary" />
                {txt('월별 비용 트렌드', 'Monthly cost trend')}
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
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1rem', fontWeight: 600 }}>
                <AssessmentIcon color="primary" />
                {txt('카테고리별 비용 분석', 'Cost by category')}
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
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1rem', fontWeight: 600 }}>
                <SpeedIcon color="primary" />
                {txt('부서별 비용 효율성', 'Department cost efficiency')}
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{txt('부서', 'Department')}</TableCell>
                      <TableCell align="right">{txt('비용', 'Cost')}</TableCell>
                      <TableCell align="right">{txt('예산', 'Budget')}</TableCell>
                      <TableCell align="right">{txt('효율성', 'Efficiency')}</TableCell>
                      <TableCell align="center">{txt('상태', 'Status')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analysisData?.departmentCosts?.map((dept, index) => (
                      <TableRow key={index}>
                        <TableCell>{dept.department}</TableCell>
                        <TableCell align="right">Rs. {dept.cost.toLocaleString()}</TableCell>
                        <TableCell align="right">Rs. {dept.budget.toLocaleString()}</TableCell>
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
                            label={
                              dept.efficiency > 80
                                ? txt('우수', 'Excellent')
                                : dept.efficiency > 60
                                  ? txt('양호', 'Good')
                                  : txt('개선필요', 'Needs improvement')
                            }
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minWidth: 0 }}>
                    <PsychologyIcon color="primary" sx={{ fontSize: '1.35rem', flexShrink: 0 }} />
                    <Typography variant="subtitle1" component="h2" sx={{ fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.35 }}>
                      {insight.title}
                    </Typography>
                    <Chip
                      label={insight.type}
                      size="small"
                      color={insight.type === 'cost_optimization' ? 'success' : 'primary'}
                      sx={{ '& .MuiChip-label': { fontSize: '0.6875rem', fontFamily: 'ui-monospace, monospace' } }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Chip
                      label={insight.impact}
                      size="small"
                      color={insight.impact === 'high' ? 'error' : insight.impact === 'medium' ? 'warning' : 'default'}
                      sx={{ '& .MuiChip-label': { fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' } }}
                    />
                    <Chip
                      label={`${formatConfidencePercent(insight.confidence)}% ${txt('신뢰도', 'confidence')}`}
                      size="small"
                      color="info"
                      sx={{ '& .MuiChip-label': { fontSize: '0.75rem', fontWeight: 600 } }}
                    />
                  </Box>
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2, fontSize: '0.9375rem', lineHeight: 1.65 }}>
                  {insight.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  {insight.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{ '& .MuiChip-label': { fontSize: '0.75rem' } }}
                    />
                  ))}
                </Box>
                {insight.estimatedSavings && (
                  <Box sx={{ mt: 2, px: 2, py: 1.5, bgcolor: 'success.main', borderRadius: 1 }}>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: 'success.contrastText' }}>
                      {txt('예상 절약액:', 'Est. savings:')} Rs. {insight.estimatedSavings.toLocaleString()}
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
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1rem', fontWeight: 600 }}>
                <TimelineIcon color="primary" />
                {txt('비용 예측', 'Cost forecast')}
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
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1rem', fontWeight: 600 }}>
                <InsightsIcon color="primary" />
                {txt('예측 요인', 'Forecast factors')}
              </Typography>
              <List>
                {analysisData?.predictions?.map((prediction, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={prediction.period}
                      secondary={`Rs. ${prediction.predictedCost.toLocaleString()} (${txt('신뢰도', 'confidence')}: ${formatConfidencePercent(prediction.confidence)}%)`}
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
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
                  {benchmark.metric}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{txt('현재', 'Current')}</Typography>
                    <Typography variant="h6">{benchmark.current} {benchmark.unit}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{txt('업계 평균', 'Industry avg.')}</Typography>
                    <Typography variant="body2">{benchmark.industry} {benchmark.unit}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{txt('최고 수준', 'Best in class')}</Typography>
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
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PsychologyIcon color="primary" sx={{ fontSize: '1.35rem' }} />
            <Typography component="span" sx={{ fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.35 }}>
              {selectedInsight?.title}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedInsight && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body1" sx={{ fontSize: '0.9375rem', lineHeight: 1.65, color: 'text.secondary' }}>
                {selectedInsight.description}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={selectedInsight.type}
                  size="small"
                  color="primary"
                  sx={{ '& .MuiChip-label': { fontSize: '0.6875rem', fontFamily: 'ui-monospace, monospace' } }}
                />
                <Chip
                  label={selectedInsight.impact}
                  size="small"
                  color="secondary"
                  sx={{ '& .MuiChip-label': { fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' } }}
                />
                <Chip
                  label={`${formatConfidencePercent(selectedInsight.confidence)}% ${txt('신뢰도', 'confidence')}`}
                  size="small"
                  color="info"
                  sx={{ '& .MuiChip-label': { fontSize: '0.75rem', fontWeight: 600 } }}
                />
              </Box>

              <Divider />

              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                {txt('추천 사항', 'Recommendations')}
              </Typography>
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
                <Box sx={{ px: 2, py: 1.5, bgcolor: 'success.main', borderRadius: 1 }}>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: 'success.contrastText' }}>
                    {txt('예상 절약액:', 'Est. savings:')} Rs. {selectedInsight.estimatedSavings.toLocaleString()}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInsightDialog(false)}>{txt('닫기', 'Close')}</Button>
          <Button 
            onClick={() => handleInsightStatusUpdate(selectedInsight?.id || '', 'implemented')} 
            variant="contained"
            disabled={selectedInsight?.status === 'implemented'}
          >
            {txt('구현하기', 'Mark implemented')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CostAnalysis;