import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Autocomplete,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Home as HomeIcon,
  LocalHospital as SickIcon,
  Person as PersonIcon,
  School as StudyIcon,
  Event as EventIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import { useStore, useMenuStore } from '../../store';
import { vacationService, api } from '../../services/api';
import { findMenuIdByPath } from '../../utils/findMenuByPath';
import { useTranslation } from 'react-i18next';

const VACATION_MENU_ROUTES = ['/hr/leave'];

interface User {
  id: number;
  username: string;
  email: string;
  department?: string;
  position?: string;
}

const VacationRequest: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { user } = useStore();
  const { menus, hasMenuPermission, loading: menusLoading } = useMenuStore();

  const hrElevated = user?.role === 'root' || user?.role === 'admin';
  const vacationMenuFlags = useMemo(() => {
    const check = (action: 'view' | 'create' | 'edit' | 'delete') => {
      if (hrElevated) return true;
      for (const route of VACATION_MENU_ROUTES) {
        const mid = findMenuIdByPath(menus, route);
        if (mid != null && hasMenuPermission(mid, action)) return true;
      }
      return false;
    };
    return {
      canCreate: check('create'),
      canEdit: check('edit')
    };
  }, [menus, hasMenuPermission, user?.role]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [annualLeaveInfo, setAnnualLeaveInfo] = useState<any>(null);
  const [vacationPolicy, setVacationPolicy] = useState<{ annualLeaveStartDays: number; availableTypes?: string[] } | null>(null);
  const [formData, setFormData] = useState({
    vacationType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
    approvedBy: null as number | null
  });

  const steps = ['휴가 정보', '승인 정보', '검토 및 확인'];

  useEffect(() => {
    loadUsers();
    loadAnnualLeaveInfo();
    loadVacationPolicy();
    if (id) {
      loadVacation();
    }
  }, [id]);

  /** 메뉴 로드 후 권한 없으면 목록으로 (미로드 시 오판 방지) */
  useEffect(() => {
    if (menusLoading || !user) return;
    const tabIndex = user.role === 'admin' || user.role === 'root' ? 1 : 0;
    if (!id && !hrElevated && !vacationMenuFlags.canCreate) {
      setError(t('vacationManagement.noPermissionCreate'));
      const tmr = window.setTimeout(() => navigate(`/hr/leave?tab=${tabIndex}`), 2000);
      return () => window.clearTimeout(tmr);
    }
    if (id && !hrElevated && !vacationMenuFlags.canEdit) {
      setError(t('vacationManagement.noPermissionEditRequest'));
      const tmr = window.setTimeout(() => navigate(`/hr/leave?tab=${tabIndex}`), 2000);
      return () => window.clearTimeout(tmr);
    }
  }, [
    id,
    user,
    menusLoading,
    hrElevated,
    vacationMenuFlags.canCreate,
    vacationMenuFlags.canEdit,
    navigate,
    t
  ]);

  const cannotSaveByMenu =
    !menusLoading &&
    ((!id && !hrElevated && !vacationMenuFlags.canCreate) ||
      (!!id && !hrElevated && !vacationMenuFlags.canEdit));

  const loadVacationPolicy = async () => {
    try {
      const response = await vacationService.getVacationPolicy();
      if (response.success) {
        setVacationPolicy(response.data);
      }
    } catch (error: any) {
      console.error('휴가 정책 조회 오류:', error);
    }
  };

  const loadAnnualLeaveInfo = async () => {
    try {
      const response = await vacationService.getAnnualLeaveInfo();
      if (response.success) {
        setAnnualLeaveInfo(response.data);
      }
    } catch (error: any) {
      console.error('연차 정보 조회 오류:', error);
    }
  };

  const loadUsers = async () => {
    try {
      // 같은 회사의 활성 사용자만 조회
      const response = await api.get('/users', {
        params: {
          status: 'active',
          company_id: user?.company_id // 같은 회사 직원만 필터링
        }
      });
      if (response.data.success) {
        const allUsers = response.data.data || [];
        // 같은 회사 직원만 필터링 (추가 안전장치)
        // 자신을 제외 (자신에게는 신청할 수 없음)
        const sameCompanyUsers = allUsers.filter((u: any) => 
          u.company_id === user?.company_id && u.id !== user?.id
        );
        setUsers(sameCompanyUsers);
      }
    } catch (error: any) {
      console.error('사용자 목록 조회 오류:', error);
    }
  };

  const loadVacation = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await vacationService.getVacation(parseInt(id));
      if (response.success && response.data) {
        const vacation = response.data;
        setFormData({
          vacationType: vacation.vacation_type,
          startDate: vacation.start_date,
          endDate: vacation.end_date,
          reason: vacation.reason,
          approvedBy: vacation.approved_by || null
        });
      } else {
        setError('휴가 정보를 불러올 수 없습니다.');
      }
    } catch (error: any) {
      console.error('휴가 조회 오류:', error);
      setError(error.response?.data?.message || '휴가 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleNext = () => {
    // 단계별 유효성 검사
    if (activeStep === 0) {
      if (!formData.vacationType) {
        setError('휴가 유형을 선택해주세요.');
        return;
      }
      if (!formData.startDate || !formData.endDate) {
        setError('시작일과 종료일을 입력해주세요.');
        return;
      }
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        setError('시작일이 종료일보다 늦을 수 없습니다.');
        return;
      }
      // 연차 선택 시 사용 가능 여부 확인
      if (formData.vacationType === 'annual') {
        if (!annualLeaveInfo || !annualLeaveInfo.canUseAnnualLeave) {
          setError('연차를 사용할 수 없습니다. 연차 사용 가능일을 확인해주세요.');
          return;
        }
        if (annualLeaveInfo.availableDays <= 0) {
          setError('사용 가능한 연차가 없습니다.');
          return;
        }
        const requestedDays = calculateDays(formData.startDate, formData.endDate);
        if (requestedDays > annualLeaveInfo.availableDays) {
          setError(`사용 가능한 연차(${annualLeaveInfo.availableDays}일)를 초과했습니다.`);
          return;
        }
      }
    } else if (activeStep === 1) {
      if (!formData.approvedBy) {
        setError('승인자를 선택해주세요.');
        return;
      }
      if (!formData.reason.trim()) {
        setError('휴가 사유를 입력해주세요.');
        return;
      }
    }
    setError(null);
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!id && !hrElevated && !vacationMenuFlags.canCreate) {
      setError(t('vacationManagement.noPermissionCreate'));
      return;
    }
    if (id && !hrElevated && !vacationMenuFlags.canEdit) {
      setError(t('vacationManagement.noPermissionEditRequest'));
      return;
    }

    const days = calculateDays(formData.startDate, formData.endDate);

    setSaving(true);
    try {
      const vacationData: any = {
        user_id: user?.id, // 본인 신청 시 로그인 사용자 ID 전달
        vacation_type: formData.vacationType,
        start_date: formData.startDate,
        end_date: formData.endDate,
        days: days,
        reason: formData.reason
      };

      // 승인자 지정 (신청 시에만)
      if (formData.approvedBy) {
        vacationData.approved_by = formData.approvedBy;
      }

      let response;
      if (id) {
        // 수정
        response = await vacationService.updateVacation(parseInt(id), vacationData);
      } else {
        // 신청
        response = await vacationService.createVacation(vacationData);
      }

      if (response.success) {
        setSuccess(id ? '휴가 신청이 수정되었습니다.' : '휴가 신청이 완료되었습니다.');
        setTimeout(() => {
          // "내가 신청한 휴가" 탭으로 이동 (admin이면 1번, 아니면 0번)
          const tabIndex = user?.role === 'admin' || user?.role === 'root' ? 1 : 0;
          navigate(`/hr/leave?tab=${tabIndex}`);
        }, 1500);
      } else {
        setError(response.message || '휴가 신청에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('휴가 저장 오류:', error);
      setError(error.response?.data?.message || '휴가 신청 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const allVacationTypes = [
    { key: 'annual', name: '연차', icon: <HomeIcon /> },
    { key: 'sick', name: '병가', icon: <SickIcon /> },
    { key: 'personal', name: '개인사유', icon: <PersonIcon /> },
    { key: 'study', name: '교육', icon: <StudyIcon /> },
    { key: 'maternity', name: '출산', icon: <EventIcon /> },
    { key: 'paternity', name: '육아', icon: <WorkIcon /> }
  ];

  // 회사가 제공하는 휴가 유형만 필터링
  const vacationTypes = React.useMemo(() => {
    if (!vacationPolicy?.availableTypes || vacationPolicy.availableTypes.length === 0) {
      // 정책이 없으면 모든 유형 표시 (기본값)
      return allVacationTypes;
    }
    return allVacationTypes.filter(type => 
      vacationPolicy.availableTypes!.includes(type.key)
    );
  }, [vacationPolicy?.availableTypes]);

  // 선택된 휴가 유형이 제공되지 않는 경우 첫 번째 제공되는 유형으로 변경
  React.useEffect(() => {
    if (vacationTypes.length > 0 && !vacationTypes.find(t => t.key === formData.vacationType)) {
      setFormData({ ...formData, vacationType: vacationTypes[0].key });
    }
  }, [vacationTypes]);

  const selectedApprover = users.find(u => u.id === formData.approvedBy);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 0, backgroundColor: 'workArea.main', borderRadius: 2, minHeight: '100%' }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => {
            // 사용자 역할에 따라 "내가 신청한 휴가" 탭으로 이동
            // admin/root: tab=1, 일반 사용자: tab=0
            const tabIndex = (user?.role === 'admin' || user?.role === 'root') ? 1 : 0;
            navigate(`/hr/leave?tab=${tabIndex}`);
          }}
          sx={{ mr: 2 }}
        >
          목록으로
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {id ? '휴가 신청 수정' : '새 휴가 신청'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Stepper 폼 */}
      <Card sx={{ boxShadow: 2, borderRadius: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {/* 1단계: 휴가 정보 */}
            <Step>
              <StepLabel>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  휴가 정보
                </Typography>
              </StepLabel>
              <StepContent>
                <Grid container spacing={3} sx={{ mt: 1 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      휴가 유형 *
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      휴가 유형을 선택하세요
                    </Typography>
                    <FormControl fullWidth required>
                      <Select
                        value={formData.vacationType}
                        onChange={(e) => setFormData({ ...formData, vacationType: e.target.value })}
                        displayEmpty
                        sx={{ 
                          '& .MuiSelect-select': { 
                            display: 'flex', 
                            alignItems: 'center',
                            py: 1.5
                          }
                        }}
                      >
                        {vacationTypes.map(type => (
                          <MenuItem key={type.key} value={type.key}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                                {type.icon}
                              </Box>
                              <Typography>{type.name}</Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    {formData.vacationType === 'annual' && annualLeaveInfo && (
                      <Alert 
                        severity={annualLeaveInfo.canUseAnnualLeave ? 'info' : 'warning'}
                        sx={{ 
                          borderRadius: 1,
                          '& .MuiAlert-message': {
                            fontWeight: 500
                          }
                        }}
                      >
                        {annualLeaveInfo.canUseAnnualLeave ? (
                          <>
                            남은 연차: <strong>{annualLeaveInfo.availableDays}일</strong>
                            {annualLeaveInfo.usedDays > 0 && (
                              <> (사용: {annualLeaveInfo.usedDays}일)</>
                            )}
                            {annualLeaveInfo.totalEarnedDays > 0 && (
                              <> / 총 획득: {annualLeaveInfo.totalEarnedDays}일</>
                            )}
                          </>
                        ) : (
                          <>
                            연차 사용 가능까지 <strong>{annualLeaveInfo.daysUntilEligible}일</strong> 남았습니다.
                            <br />
                            <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                              {vacationPolicy && vacationPolicy.annualLeaveStartDays === 0 
                                ? '연차는 즉시 사용 가능합니다.'
                                : `입사일로부터 ${vacationPolicy?.annualLeaveStartDays || 240}일 이후부터 사용 가능합니다.`}
                            </Typography>
                          </>
                        )}
                      </Alert>
                    )}
                    {(formData.startDate && formData.endDate) && formData.vacationType !== 'annual' && (
                      <Alert 
                        severity="info" 
                        sx={{ 
                          borderRadius: 1,
                          '& .MuiAlert-message': {
                            fontWeight: 500
                          }
                        }}
                      >
                        총 휴가 일수: <strong>{calculateDays(formData.startDate, formData.endDate)}일</strong>
                      </Alert>
                    )}
                    {(formData.startDate && formData.endDate) && formData.vacationType === 'annual' && (
                      <Alert 
                        severity="info" 
                        sx={{ 
                          borderRadius: 1,
                          '& .MuiAlert-message': {
                            fontWeight: 500
                          }
                        }}
                      >
                        신청 휴가 일수: <strong>{calculateDays(formData.startDate, formData.endDate)}일</strong>
                        {annualLeaveInfo && annualLeaveInfo.canUseAnnualLeave && (
                          <>
                            {' '}/ 남은 연차: <strong>{annualLeaveInfo.availableDays}일</strong>
                          </>
                        )}
                      </Alert>
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      시작일 *
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      휴가 시작일을 선택하세요
                    </Typography>
                    <TextField
                      fullWidth
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                      sx={{
                        '& .MuiInputBase-input': {
                          py: 1.5
                        }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      종료일 *
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      휴가 종료일을 선택하세요
                    </Typography>
                    <TextField
                      fullWidth
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                      sx={{
                        '& .MuiInputBase-input': {
                          py: 1.5
                        }
                      }}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={
                      formData.vacationType === 'annual' && 
                      annualLeaveInfo && 
                      (!annualLeaveInfo.canUseAnnualLeave || annualLeaveInfo.availableDays <= 0)
                    }
                    sx={{
                      minWidth: 100,
                      py: 1.25,
                      borderRadius: 1.5,
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    다음
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* 2단계: 승인 정보 */}
            <Step>
              <StepLabel>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    승인 정보
                  </Typography>
                  {!formData.approvedBy && (
                    <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 500 }}>
                      (승인자를 선택해주세요)
                    </Typography>
                  )}
                </Box>
              </StepLabel>
              <StepContent>
                <Grid container spacing={3} sx={{ mt: 1 }}>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      승인자 *
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      휴가를 승인할 사람을 선택하세요
                    </Typography>
                    <Autocomplete
                      options={users}
                      getOptionLabel={(option) => `${option.username}${option.department ? ` (${option.department})` : ''}`}
                      value={selectedApprover || null}
                      onChange={(event, newValue) => {
                        setFormData({ ...formData, approvedBy: newValue?.id || null });
                        setError(null); // 승인자 선택 시 오류 메시지 제거
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="승인자를 선택하세요"
                          error={!formData.approvedBy}
                          required
                          sx={{
                            '& .MuiInputBase-input': {
                              py: 1.5
                            }
                          }}
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props} sx={{ py: 1.5 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {option.username}
                            </Typography>
                            {option.department && (
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                {option.department} {option.position ? `· ${option.position}` : ''}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      휴가 사유 *
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      휴가 사유를 입력하세요
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={6}
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      required
                      placeholder="휴가 주세요."
                      sx={{
                        '& .MuiInputBase-root': {
                          alignItems: 'flex-start'
                        }
                      }}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    onClick={handleBack}
                    sx={{
                      minWidth: 100,
                      py: 1.25,
                      borderRadius: 1.5,
                      textTransform: 'none',
                      fontWeight: 500
                    }}
                  >
                    이전
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={!formData.approvedBy}
                    sx={{
                      minWidth: 100,
                      py: 1.25,
                      borderRadius: 1.5,
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    다음
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* 3단계: 검토 및 확인 */}
            <Step>
              <StepLabel>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  검토 및 확인
                </Typography>
              </StepLabel>
              <StepContent>
                <Card variant="outlined" sx={{ mt: 1, p: 3, bgcolor: 'grey.50' }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        휴가 유형
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        {vacationTypes.find(t => t.key === formData.vacationType)?.icon}
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {vacationTypes.find(t => t.key === formData.vacationType)?.name}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        휴가 일수
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                        {formData.startDate && formData.endDate 
                          ? `${calculateDays(formData.startDate, formData.endDate)}일`
                          : '-'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        시작일
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                        {formData.startDate || '-'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        종료일
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                        {formData.endDate || '-'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        승인자
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                        {selectedApprover 
                          ? `${selectedApprover.username}${selectedApprover.department ? ` (${selectedApprover.department})` : ''}`
                          : '미지정'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        휴가 사유
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                        {formData.reason || '-'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Card>
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    onClick={handleBack}
                    sx={{
                      minWidth: 100,
                      py: 1.25,
                      borderRadius: 1.5,
                      textTransform: 'none',
                      fontWeight: 500
                    }}
                  >
                    이전
                  </Button>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        // 사용자 역할에 따라 "내가 신청한 휴가" 탭으로 이동
                        // admin/root: tab=1, 일반 사용자: tab=0
                        const tabIndex = (user?.role === 'admin' || user?.role === 'root') ? 1 : 0;
                        navigate(`/hr/leave?tab=${tabIndex}`);
                      }}
                      disabled={saving}
                      sx={{
                        minWidth: 100,
                        py: 1.25,
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 500
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleSubmit}
                      startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                      disabled={saving || cannotSaveByMenu}
                      sx={{
                        minWidth: 120,
                        py: 1.25,
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 600,
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
                          boxShadow: '0 4px 8px 2px rgba(33, 203, 243, .4)',
                        },
                        '&:disabled': {
                          background: '#cbd5e0',
                          boxShadow: 'none'
                        }
                      }}
                    >
                      {saving ? '저장 중...' : '저장'}
                    </Button>
                  </Box>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VacationRequest;


