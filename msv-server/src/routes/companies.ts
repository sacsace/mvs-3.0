import express from 'express';
import { Sequelize, QueryTypes } from 'sequelize';
import { Company, CompanyGstNumber, User } from '../models';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import sequelize from '../config/database';

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 모든 회사 조회 (테넌트별)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = (req as any).user.tenant_id;
    const userRole = (req as any).user.role;
    const userId = (req as any).user.id;
    const userCompanyId = (req as any).user.company_id;
    
    console.log('🔍 회사 목록 조회 시작:', {
      userId: userId,
      userCompanyId: userCompanyId,
      tenantId: tenantId,
      userRole: userRole,
      isRoot: userRole === 'root',
      isAudit: userRole === 'audit'
    });
    
    // root나 audit 권한이면 모든 회사 조회 가능, 아니면 자신의 테넌트 회사만
    const whereClause: any = {};
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      console.log('🔍 일반 사용자 - tenant_id 필터 적용:', tenantId);
    } else {
      console.log('🔍 Root/Audit 사용자 - 모든 회사 조회 (WHERE 절 없음)');
    }
    
    console.log('🔍 WHERE 절:', whereClause);
    
    // 디버깅: WHERE 절 없이 전체 조회해서 개수 확인
    const allCompaniesCount = await (Company as any).count();
    console.log('🔍 전체 회사 개수 (WHERE 절 없이):', allCompaniesCount);
    
    let companies: any[] = [];
    
    try {
      // company_gst_numbers 테이블 존재 여부 확인
      const [tableCheck] = await (sequelize as any).query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'company_gst_numbers'
        ) as exists;
      `, { type: QueryTypes.SELECT }) as any[];
      
      console.log('🔍 테이블 존재 확인 결과 (목록):', JSON.stringify(tableCheck, null, 2));
      console.log('🔍 tableCheck 타입:', typeof tableCheck);
      console.log('🔍 tableCheck[0]:', tableCheck?.[0]);
      console.log('🔍 tableCheck[0]?.exists:', tableCheck?.[0]?.exists);
      
      // tableCheck 구조 확인 및 처리
      const tableExists = tableCheck && (
        (Array.isArray(tableCheck) && tableCheck[0] && tableCheck[0].exists) ||
        (tableCheck.exists) ||
        (tableCheck[0]?.exists === true)
      );
      
      console.log('🔍 테이블 존재 여부 최종 판단:', tableExists);
      
      if (tableExists) {
        console.log('✅ company_gst_numbers 테이블 존재 확인됨 (목록 조회)');
        
        // 먼저 회사 목록만 조회
        companies = await (Company as any).findAll({
          where: whereClause,
          order: [['created_at', 'DESC']]
        });
        
        console.log('🔍 회사 목록 조회 완료, 개수:', companies.length);
        console.log('🔍 회사 ID 목록:', companies.map((c: any) => c.id));
        
        // 각 회사별로 GST 번호 직접 조회
        companies = await Promise.all(companies.map(async (company: any) => {
          const companyData: any = company.toJSON();
          
          // 이미지 필드 변환
          if (companyData.company_logo) {
            companyData.company_logo = `data:image/jpeg;base64,${companyData.company_logo.toString('base64')}`;
          }
          if (companyData.company_seal) {
            companyData.company_seal = `data:image/jpeg;base64,${companyData.company_seal.toString('base64')}`;
          }
          if (companyData.ceo_signature) {
            companyData.ceo_signature = `data:image/jpeg;base64,${companyData.ceo_signature.toString('base64')}`;
          }
          
          // login_period_start, login_period_end를 mvs_start_date, mvs_end_date로 변환
          if (companyData.login_period_start) {
            if (companyData.login_period_start instanceof Date) {
              companyData.mvs_start_date = companyData.login_period_start.toISOString().split('T')[0];
            } else if (typeof companyData.login_period_start === 'string') {
              companyData.mvs_start_date = companyData.login_period_start.split('T')[0];
            } else {
              companyData.mvs_start_date = '';
            }
          } else {
            companyData.mvs_start_date = '';
          }
          
          if (companyData.login_period_end) {
            if (companyData.login_period_end instanceof Date) {
              companyData.mvs_end_date = companyData.login_period_end.toISOString().split('T')[0];
            } else if (typeof companyData.login_period_end === 'string') {
              companyData.mvs_end_date = companyData.login_period_end.split('T')[0];
            } else {
              companyData.mvs_end_date = '';
            }
          } else {
            companyData.mvs_end_date = '';
          }
          
          // GST 번호 직접 조회 (Raw SQL 사용)
          console.log(`\n🔍 [GST 조회 시작] 회사 ID: ${companyData.id}, 회사명: ${companyData.name}`);
          try {
            // Raw SQL 쿼리로 직접 조회 (status 조건 제거하여 모든 GST 조회)
            const gstQuery = `
              SELECT gst_number, state_code, status 
              FROM company_gst_numbers 
              WHERE company_id = $1
              ORDER BY id ASC
            `;
            
            console.log(`🔍 [GST 조회] 회사 ID ${companyData.id} - 실행할 SQL 쿼리:`, gstQuery.replace(/\$1/, companyData.id.toString()));
            
            const gstResults = await (sequelize as any).query(gstQuery, {
              bind: [companyData.id],
              type: QueryTypes.SELECT
            }) as any[];
            
            console.log(`🔍 [GST 조회] 회사 ID ${companyData.id} - 쿼리 실행 완료`);
            console.log(`🔍 [GST 조회] 회사 ID ${companyData.id} - 조회 결과 (Raw SQL):`, JSON.stringify(gstResults, null, 2));
            console.log(`🔍 [GST 조회] 회사 ID ${companyData.id} - 조회된 행 개수:`, gstResults.length);
            
            companyData.gst_numbers = gstResults.map((row: any) => row.gst_number).filter((gst: string) => gst);
            
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`📋 회사 ID ${companyData.id} (${companyData.name}) - GST 번호 조회 결과`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('조회된 행 개수:', gstResults.length);
            console.log('GST 번호 개수:', companyData.gst_numbers.length);
            if (companyData.gst_numbers && companyData.gst_numbers.length > 0) {
              companyData.gst_numbers.forEach((gst: string, idx: number) => {
                console.log(`  ${idx + 1}. ${gst}`);
              });
            } else {
              console.log('  (GST 번호 없음)');
            }
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          } catch (gstError: any) {
            console.error(`\n❌ [GST 조회 실패] 회사 ID ${companyData.id}의 GST 번호 조회 실패:`);
            console.error('에러 메시지:', gstError.message);
            console.error('에러 스택:', gstError.stack);
            console.error('\n');
            companyData.gst_numbers = [];
          }
          
          // 로그인한 사용자의 회사 정보인 경우 GST 번호 로그 출력
          if (companyData.id === userCompanyId) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('👤 로그인한 사용자의 회사 GST 번호 (목록 조회)');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('사용자 ID:', userId);
            console.log('회사 ID:', companyData.id);
            console.log('회사명:', companyData.name);
            console.log('GST 번호:', companyData.gst_numbers);
            console.log('GST 번호 개수:', companyData.gst_numbers?.length || 0);
            if (companyData.gst_numbers && companyData.gst_numbers.length > 0) {
              companyData.gst_numbers.forEach((gst: string, idx: number) => {
                console.log(`  ${idx + 1}. ${gst}`);
              });
            } else {
              console.log('  (GST 번호 없음)');
            }
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          }
          
          // 각 회사별 실제 직원 수 계산
          try {
            const employeeCount = await (User as any).count({
              where: {
                company_id: companyData.id,
                status: 'active'
              }
            });
            companyData.employee_count = employeeCount || 0;
          } catch (employeeCountError: any) {
            console.error(`직원 수 계산 오류 (회사 ID: ${companyData.id}):`, employeeCountError);
            companyData.employee_count = 0;
          }
          
          return companyData;
        }));
      } else {
        // 테이블이 없으면 기본 조회
        console.log('⚠️ company_gst_numbers 테이블이 없음, 기본 조회 진행');
        companies = await (Company as any).findAll({
          where: whereClause,
          order: [['created_at', 'DESC']]
        });
        
        console.log('🔍 기본 조회 완료, 개수:', companies.length);
        
        // 데이터 변환 (Promise.all로 비동기 처리)
        companies = await Promise.all(companies.map(async (company: any) => {
          const companyData: any = company.toJSON ? company.toJSON() : company;
          
          // 이미지 필드 변환
          if (companyData.company_logo) {
            companyData.company_logo = `data:image/jpeg;base64,${companyData.company_logo.toString('base64')}`;
          }
          if (companyData.company_seal) {
            companyData.company_seal = `data:image/jpeg;base64,${companyData.company_seal.toString('base64')}`;
          }
          if (companyData.ceo_signature) {
            companyData.ceo_signature = `data:image/jpeg;base64,${companyData.ceo_signature.toString('base64')}`;
          }
          
          // login_period_start, login_period_end를 mvs_start_date, mvs_end_date로 변환
          if (companyData.login_period_start) {
            if (companyData.login_period_start instanceof Date) {
              companyData.mvs_start_date = companyData.login_period_start.toISOString().split('T')[0];
            } else if (typeof companyData.login_period_start === 'string') {
              companyData.mvs_start_date = companyData.login_period_start.split('T')[0];
            } else {
              companyData.mvs_start_date = '';
            }
          } else {
            companyData.mvs_start_date = '';
          }
          
          if (companyData.login_period_end) {
            if (companyData.login_period_end instanceof Date) {
              companyData.mvs_end_date = companyData.login_period_end.toISOString().split('T')[0];
            } else if (typeof companyData.login_period_end === 'string') {
              companyData.mvs_end_date = companyData.login_period_end.split('T')[0];
            } else {
              companyData.mvs_end_date = '';
            }
          } else {
            companyData.mvs_end_date = '';
          }
          
          // 각 회사별 실제 직원 수 계산
          try {
            const employeeCount = await (User as any).count({
              where: {
                company_id: companyData.id,
                status: 'active'
              }
            });
            companyData.employee_count = employeeCount || 0;
          } catch (employeeCountError: any) {
            console.error(`직원 수 계산 오류 (회사 ID: ${companyData.id}):`, employeeCountError);
            companyData.employee_count = 0;
          }
          
          companyData.gst_numbers = [];
          return companyData;
        }));
      }
    } catch (includeError: any) {
      // include 실패 시 기본 조회
      console.log('⚠️ GST 번호 조회 실패, 기본 데이터만 반환:', includeError.message);
      companies = await (Company as any).findAll({
        where: whereClause,
        order: [['created_at', 'DESC']]
      });
      
      console.log('🔍 에러 후 기본 조회 완료, 개수:', companies.length);
      
      // 데이터 변환
      companies = companies.map((company: any) => {
        const companyData: any = company.toJSON ? company.toJSON() : company;
        
        // 이미지 필드 변환
        if (companyData.company_logo) {
          companyData.company_logo = `data:image/jpeg;base64,${companyData.company_logo.toString('base64')}`;
        }
        if (companyData.company_seal) {
          companyData.company_seal = `data:image/jpeg;base64,${companyData.company_seal.toString('base64')}`;
        }
        if (companyData.ceo_signature) {
          companyData.ceo_signature = `data:image/jpeg;base64,${companyData.ceo_signature.toString('base64')}`;
        }
        
        companyData.gst_numbers = [];
        return companyData;
      });
    }

    console.log('✅ 회사 목록 조회 완료, 반환할 회사 개수:', companies.length);
    if (companies.length === 0) {
      console.log('⚠️ 회사 목록이 비어있습니다. WHERE 절:', whereClause);
      console.log('⚠️ 요청한 tenant_id:', tenantId, 'userRole:', userRole);
      
      // WHERE 절 없이 조회해서 실제 데이터 확인
      const allCompanies = await (Company as any).findAll({
        attributes: ['id', 'name', 'tenant_id', 'company_id'],
        limit: 5
      });
      const allCompaniesData = allCompanies.map((c: any) => c.toJSON ? c.toJSON() : c);
      console.log('🔍 데이터베이스의 실제 회사 샘플 (최대 5개):', allCompaniesData);
    } else {
      console.log('✅ 조회된 회사 목록:', companies.slice(0, 3).map((c: any) => ({
        id: c.id,
        name: c.name,
        tenant_id: c.tenant_id
      })));
    }
    
    res.json({
      success: true,
      data: companies
    });
  } catch (error) {
    console.error('❌ 회사 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '회사 목록을 불러오는데 실패했습니다.'
    });
  }
});

// 특정 회사 GST 번호 조회
router.get('/:id/gst-numbers', authenticateToken, async (req, res) => {
  try {
    const tenantId = (req as any).user.tenant_id;
    const userRole = (req as any).user.role;
    const id = Number(req.params.id);

    if (!Number.isFinite(id)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 회사 ID입니다.'
      });
    }

    const whereClause: any = { id };
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
    }

    const company = await (Company as any).findOne({
      where: whereClause,
      attributes: ['id', 'name']
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '회사를 찾을 수 없습니다.'
      });
    }

    const [tableCheck] = await (sequelize as any).query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'company_gst_numbers'
      ) as exists;
    `, { type: QueryTypes.SELECT }) as any[];

    const tableExists = Boolean((tableCheck as any)?.exists ?? (tableCheck as any)?.[0]?.exists);
    if (!tableExists) {
      return res.json({
        success: true,
        data: { gst_numbers: [] }
      });
    }

    const gstResults = await (sequelize as any).query(`
      SELECT gst_number
      FROM company_gst_numbers
      WHERE company_id = $1
      ORDER BY id ASC
    `, {
      bind: [id],
      type: QueryTypes.SELECT
    }) as any[];

    const gstNumbers = gstResults
      .map((row: any) => row.gst_number)
      .filter((gst: string) => gst && gst.trim() !== '');

    return res.json({
      success: true,
      data: { gst_numbers: gstNumbers }
    });
  } catch (error) {
    console.error('회사 GST 번호 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: 'GST 번호를 불러오는데 실패했습니다.'
    });
  }
});

// 특정 회사 조회
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).user.tenant_id;
    const userRole = (req as any).user.role;
    
    // root나 audit 권한이면 모든 회사 조회 가능, 아니면 자신의 회사만
    const whereClause: any = { id: id };
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
    }
    
    const userId = (req as any).user.id;
    const userCompanyId = (req as any).user.company_id;
    
    console.log('🔍 회사 조회 시작:', {
      id: id,
      tenantId: tenantId,
      userRole: userRole,
      userId: userId,
      userCompanyId: userCompanyId
    });
    
    let company: any = null;
    
    try {
      // company_gst_numbers 테이블 존재 여부 확인
      const [tableCheck] = await (sequelize as any).query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'company_gst_numbers'
        ) as exists;
      `, { type: QueryTypes.SELECT }) as any[];
      
      console.log('🔍 테이블 존재 확인 결과:', tableCheck);
      
      // 먼저 회사 정보만 조회
      company = await (Company as any).findOne({
        where: whereClause
      });
      
      if (company) {
        const companyData: any = company.toJSON();
        
        console.log('🔍 회사 기본 정보 조회 완료:', {
          id: companyData.id,
          name: companyData.name
        });
        
        // 이미지 필드 변환
        if (companyData.company_logo) {
          companyData.company_logo = `data:image/jpeg;base64,${companyData.company_logo.toString('base64')}`;
        }
        if (companyData.company_seal) {
          companyData.company_seal = `data:image/jpeg;base64,${companyData.company_seal.toString('base64')}`;
        }
        if (companyData.ceo_signature) {
          companyData.ceo_signature = `data:image/jpeg;base64,${companyData.ceo_signature.toString('base64')}`;
        }
        
        // login_period_start, login_period_end를 mvs_start_date, mvs_end_date로 변환
        if (companyData.login_period_start) {
          if (companyData.login_period_start instanceof Date) {
            companyData.mvs_start_date = companyData.login_period_start.toISOString().split('T')[0];
          } else if (typeof companyData.login_period_start === 'string') {
            companyData.mvs_start_date = companyData.login_period_start.split('T')[0];
          } else {
            companyData.mvs_start_date = '';
          }
        } else {
          companyData.mvs_start_date = '';
        }
        
        if (companyData.login_period_end) {
          if (companyData.login_period_end instanceof Date) {
            companyData.mvs_end_date = companyData.login_period_end.toISOString().split('T')[0];
          } else if (typeof companyData.login_period_end === 'string') {
            companyData.mvs_end_date = companyData.login_period_end.split('T')[0];
          } else {
            companyData.mvs_end_date = '';
          }
        } else {
          companyData.mvs_end_date = '';
        }
        
        console.log('📅 MVS 사용 기간 변환 (특정 회사 조회):', {
          login_period_start: companyData.login_period_start,
          login_period_end: companyData.login_period_end,
          mvs_start_date: companyData.mvs_start_date,
          mvs_end_date: companyData.mvs_end_date
        });
        
        // GST 번호 직접 조회 (Raw SQL 사용)
        if (tableCheck && tableCheck[0] && tableCheck[0].exists) {
          console.log('✅ company_gst_numbers 테이블 존재 확인됨');
          console.log('🔍 GST 번호 직접 조회 시작 - 회사 ID:', companyData.id);
          
          try {
            // Raw SQL 쿼리로 직접 조회
            const gstQuery = `
              SELECT gst_number, state_code, status 
              FROM company_gst_numbers 
              WHERE company_id = $1
              ORDER BY id ASC
            `;
            
            console.log('🔍 실행할 SQL 쿼리:', gstQuery.replace(/\$1/, companyData.id.toString()));
            
            const gstResults = await (sequelize as any).query(gstQuery, {
              bind: [companyData.id],
              type: QueryTypes.SELECT
            }) as any[];
            
            console.log('🔍 GST 번호 조회 결과 (Raw SQL):', JSON.stringify(gstResults, null, 2));
            
            companyData.gst_numbers = gstResults.map((row: any) => row.gst_number).filter((gst: string) => gst);
            
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`📋 회사 ID ${companyData.id} (${companyData.name}) - GST 번호 조회 결과`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('조회된 행 개수:', gstResults.length);
            console.log('GST 번호 개수:', companyData.gst_numbers.length);
            if (companyData.gst_numbers && companyData.gst_numbers.length > 0) {
              companyData.gst_numbers.forEach((gst: string, idx: number) => {
                console.log(`  ${idx + 1}. ${gst}`);
              });
            } else {
              console.log('  (GST 번호 없음)');
            }
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          } catch (gstError: any) {
            console.error('❌ GST 번호 직접 조회 실패:', gstError.message);
            console.error('에러 스택:', gstError.stack);
            companyData.gst_numbers = [];
          }
        } else {
          console.log('⚠️ company_gst_numbers 테이블이 존재하지 않습니다.');
          companyData.gst_numbers = [];
        }
        
        // 로그인한 사용자의 회사 정보인 경우 GST 번호 로그 출력
        console.log('🔍 사용자 정보 확인:', {
          userId: userId,
          userCompanyId: userCompanyId,
          companyId: companyData.id,
          일치여부: companyData.id === userCompanyId
        });
        
        if (companyData.id === userCompanyId) {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('👤 로그인한 사용자의 회사 GST 번호');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('사용자 ID:', userId);
          console.log('회사 ID:', companyData.id);
          console.log('회사명:', companyData.name);
          console.log('GST 번호:', companyData.gst_numbers);
          console.log('GST 번호 개수:', companyData.gst_numbers?.length || 0);
          if (companyData.gst_numbers && companyData.gst_numbers.length > 0) {
            companyData.gst_numbers.forEach((gst: string, idx: number) => {
              console.log(`  ${idx + 1}. ${gst}`);
            });
          } else {
            console.log('  (GST 번호 없음)');
          }
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }
        
          // 각 회사별 실제 직원 수 계산
          try {
            // 모든 상태의 직원 수 계산 (active, inactive, suspended 모두 포함)
            const employeeCount = await (User as any).count({
              where: {
                company_id: companyData.id
              }
            });
            companyData.employee_count = employeeCount || 0;
            console.log('👥 직원 수 계산 완료:', {
              companyId: companyData.id,
              companyName: companyData.name,
              employeeCount: companyData.employee_count
            });
            
            // 디버깅: 실제 사용자 목록 확인
            const users = await (User as any).findAll({
              where: {
                company_id: companyData.id
              },
              attributes: ['id', 'username', 'status', 'company_id']
            });
            console.log('👥 회사 직원 목록:', users.map((u: any) => ({
              id: u.id,
              username: u.username,
              status: u.status,
              company_id: u.company_id
            })));
          } catch (employeeCountError: any) {
            console.error(`직원 수 계산 오류 (회사 ID: ${companyData.id}):`, employeeCountError);
            companyData.employee_count = 0;
          }
        
        console.log('🔍 최종 회사 데이터:', {
          id: companyData.id,
          name: companyData.name,
          gst_numbers: companyData.gst_numbers,
          gst_numbers_length: companyData.gst_numbers?.length,
          employee_count: companyData.employee_count
        });
        
        company = companyData;
      }
    } catch (error: any) {
      console.error('❌ 회사 조회 중 오류:', error.message);
      console.error('에러 스택:', error.stack);
      
      // 오류 발생 시 기본 회사 정보만 반환
      if (!company) {
        company = await (Company as any).findOne({
          where: whereClause
        });
      }
      
      if (company) {
        const companyData: any = company.toJSON();
        
        // 이미지 필드 변환
        if (companyData.company_logo) {
          companyData.company_logo = `data:image/jpeg;base64,${companyData.company_logo.toString('base64')}`;
        }
        if (companyData.company_seal) {
          companyData.company_seal = `data:image/jpeg;base64,${companyData.company_seal.toString('base64')}`;
        }
        if (companyData.ceo_signature) {
          companyData.ceo_signature = `data:image/jpeg;base64,${companyData.ceo_signature.toString('base64')}`;
        }
        
        // login_period_start, login_period_end를 mvs_start_date, mvs_end_date로 변환
        if (companyData.login_period_start) {
          if (companyData.login_period_start instanceof Date) {
            companyData.mvs_start_date = companyData.login_period_start.toISOString().split('T')[0];
          } else if (typeof companyData.login_period_start === 'string') {
            companyData.mvs_start_date = companyData.login_period_start.split('T')[0];
          } else {
            companyData.mvs_start_date = '';
          }
        } else {
          companyData.mvs_start_date = '';
        }
        
        if (companyData.login_period_end) {
          if (companyData.login_period_end instanceof Date) {
            companyData.mvs_end_date = companyData.login_period_end.toISOString().split('T')[0];
          } else if (typeof companyData.login_period_end === 'string') {
            companyData.mvs_end_date = companyData.login_period_end.split('T')[0];
          } else {
            companyData.mvs_end_date = '';
          }
        } else {
          companyData.mvs_end_date = '';
        }
        
        // 각 회사별 실제 직원 수 계산
        try {
          // 모든 상태의 직원 수 계산 (active, inactive, suspended 모두 포함)
          const employeeCount = await (User as any).count({
            where: {
              company_id: companyData.id
            }
          });
          companyData.employee_count = employeeCount || 0;
          console.log('👥 직원 수 계산 완료 (에러 처리 경로):', {
            companyId: companyData.id,
            companyName: companyData.name,
            employeeCount: companyData.employee_count
          });
          
          // 디버깅: 실제 사용자 목록 확인
          const users = await (User as any).findAll({
            where: {
              company_id: companyData.id
            },
            attributes: ['id', 'username', 'status', 'company_id']
          });
          console.log('👥 회사 직원 목록 (에러 처리 경로):', users.map((u: any) => ({
            id: u.id,
            username: u.username,
            status: u.status,
            company_id: u.company_id
          })));
        } catch (employeeCountError: any) {
          console.error(`직원 수 계산 오류 (회사 ID: ${companyData.id}):`, employeeCountError);
          companyData.employee_count = 0;
        }
        
        companyData.gst_numbers = [];
        company = companyData;
      }
    }

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '회사를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('회사 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '회사 정보를 불러오는데 실패했습니다.'
    });
  }
});

// 회사 생성 (root 권한만)
router.post(
  '/',
  authenticateToken,
  requireRole(['root']),
  validateBody({
    name: { required: true, type: 'string', minLength: 1, maxLength: 255 },
    business_number: { required: true, type: 'string', minLength: 4, maxLength: 50 },
    email: { type: 'string', maxLength: 100, pattern: emailPattern },
    phone: { type: 'string', maxLength: 50 },
    status: { type: 'string', oneOf: ['active', 'inactive', 'suspended'] }
  }),
  async (req, res) => {
  try {
    console.log('=== 회사 생성 요청 시작 ===');
    console.log('요청 사용자:', (req as any).user);
    const tenantId = (req as any).user.tenant_id;
    console.log('Tenant ID:', tenantId);
    console.log('요청 본문:', {
      ...req.body,
      company_logo: req.body.company_logo ? `Base64(${req.body.company_logo.length} chars)` : null,
      company_seal: req.body.company_seal ? `Base64(${req.body.company_seal.length} chars)` : null,
      ceo_signature: req.body.ceo_signature ? `Base64(${req.body.ceo_signature.length} chars)` : null
    });
    
    const companyData: any = {
      ...req.body,
      tenant_id: tenantId
    };

    // mvs_start_date, mvs_end_date를 login_period_start, login_period_end로 매핑
    if (companyData.mvs_start_date) {
      companyData.login_period_start = companyData.mvs_start_date;
      delete companyData.mvs_start_date;
    }
    if (companyData.mvs_end_date) {
      companyData.login_period_end = companyData.mvs_end_date;
      delete companyData.mvs_end_date;
    }

    // 날짜 필드 처리 (Invalid date를 null로 변환)
    if (companyData.login_period_start === 'Invalid date' || companyData.login_period_start === '' || !companyData.login_period_start) {
      companyData.login_period_start = null;
    }
    if (companyData.login_period_end === 'Invalid date' || companyData.login_period_end === '' || !companyData.login_period_end) {
      companyData.login_period_end = null;
    }

    // 빈 문자열을 null로 변환 (이미지 필드 제외)
    const imageFields = ['company_logo', 'company_seal', 'ceo_signature'];
    Object.keys(companyData).forEach(key => {
      if (!imageFields.includes(key) && companyData[key] === '') {
        companyData[key] = null;
      }
    });

    // NOT NULL 제약조건이 있는 TEXT/STRING 필드들을 빈 문자열로 설정 (null 방지)
    // 모델에서는 allowNull: true이지만 실제 DB에 NOT NULL 제약조건이 있을 수 있음
    const textFields = ['address', 'phone', 'email', 'website', 'industry', 'ceo_name', 
                        'account_holder_name', 'bank_name', 'account_number', 'ifsc_code', 
                        'swift_code', 'msme_number', 'iec_number', 'pan_number', 'bank_address'];
    textFields.forEach(field => {
      if (companyData[field] === null || companyData[field] === undefined || companyData[field] === '') {
        companyData[field] = '';
      }
    });

    // 이미지 필드 처리 (Base64를 Buffer로 변환)
    for (const field of imageFields) {
      if (companyData[field] && typeof companyData[field] === 'string' && companyData[field].startsWith('data:image')) {
        try {
          const base64Data = companyData[field].replace(/^data:image\/\w+;base64,/, '');
          companyData[field] = Buffer.from(base64Data, 'base64');
          console.log(`✅ 이미지 변환 성공: ${field}, 크기: ${companyData[field].length} bytes`);
        } catch (error: any) {
          console.error(`❌ 이미지 변환 실패 (${field}):`, error.message);
          return res.status(400).json({
            success: false,
            message: `${field} 이미지 변환에 실패했습니다.`
          });
        }
      } else if (companyData[field] === '' || companyData[field] === null) {
        companyData[field] = null;
      }
    }

    // GST 번호 처리 (별도 테이블)
    let gstNumbers: string[] | undefined = undefined;
    if (companyData.gst_numbers !== undefined) {
      gstNumbers = Array.isArray(companyData.gst_numbers) 
        ? companyData.gst_numbers.filter((gst: string) => gst && gst.trim() !== '')
        : [];
      delete companyData.gst_numbers; // Company 테이블에는 저장하지 않음
      console.log('GST 번호:', gstNumbers);
    }
    
    // 일반 필드와 이미지 필드 분리
    const nonImageData: any = {};
    const imageData: any = {};
    
    Object.keys(companyData).forEach(key => {
      if (imageFields.includes(key)) {
        imageData[key] = companyData[key];
      } else {
        nonImageData[key] = companyData[key];
      }
    });

    console.log('일반 필드 데이터:', nonImageData);
    console.log('이미지 필드 데이터:', Object.keys(imageData));

    // 일반 필드로 회사 생성
    console.log('회사 생성 시도...');
    const company = await (Company as any).create(nonImageData);
    const companyId = company.id;
    console.log('✅ 회사 생성 성공, ID:', companyId);

    // GST 번호 저장
    if (gstNumbers !== undefined && gstNumbers.length > 0) {
      console.log('🔍 GST 번호 저장 시작, 개수:', gstNumbers.length);
      try {
        // company_gst_numbers 테이블 존재 여부 확인
        const [tableCheck] = await (sequelize as any).query(`
          SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'company_gst_numbers'
          ) as exists;
        `, { type: QueryTypes.SELECT }) as any[];
        
        console.log('🔍 GST 테이블 존재 확인 결과:', tableCheck);
        
        const tableExists = tableCheck && (
          (Array.isArray(tableCheck) && tableCheck[0] && tableCheck[0].exists) ||
          (tableCheck.exists) ||
          (tableCheck[0]?.exists === true)
        );
        
        if (tableExists) {
          console.log('✅ company_gst_numbers 테이블 존재 확인됨');
          console.log('🔍 GST 번호 저장 시도...');
          console.log('🔍 저장할 GST 번호:', gstNumbers);
          console.log('🔍 회사 ID:', companyId);
          
          const gstEntries = gstNumbers.map((gst: string) => ({
            company_id: companyId,
            gst_number: gst.trim(),
            status: 'active'
          }));
          
          console.log('🔍 GST 엔트리:', JSON.stringify(gstEntries, null, 2));
          
          const createdGst = await (CompanyGstNumber as any).bulkCreate(gstEntries);
          console.log('✅ GST 번호 저장 완료:', gstNumbers);
          console.log('✅ 생성된 GST 레코드 수:', createdGst.length);
        } else {
          console.log('⚠️ company_gst_numbers 테이블이 존재하지 않습니다. GST 번호 저장을 건너뜁니다.');
        }
      } catch (gstError: any) {
        // 테이블이 없는 경우 등 에러는 무시하고 계속 진행
        console.error('❌ GST 번호 저장 오류:', gstError.message);
        console.error('에러 스택:', gstError.stack);
        if (gstError.code === '42P01') {
          console.log('⚠️ company_gst_numbers 테이블이 존재하지 않습니다. GST 번호 저장을 건너뜁니다.');
        } else {
          console.error('❌ GST 번호 저장 오류 (계속 진행):', gstError.message);
        }
      }
    } else {
      console.log('ℹ️ GST 번호가 없거나 비어있어 저장하지 않습니다.');
    }
    
    // 이미지 필드가 있으면 별도로 업데이트
    if (Object.keys(imageData).length > 0) {
      console.log('이미지 필드 저장 시도...');
      for (const [field, value] of Object.entries(imageData)) {
        if (value !== null && Buffer.isBuffer(value)) {
          const hexString = '\\x' + (value as Buffer).toString('hex');
          await (sequelize as any).query(
            `UPDATE companies SET ${field} = $1::bytea WHERE id = $2 AND tenant_id = $3`,
            {
              bind: [hexString, companyId, tenantId],
              type: QueryTypes.UPDATE
            }
          );
          console.log(`✅ ${field} 이미지 저장 완료`);
        }
      }
    }

    // 최종 회사 데이터 조회 (GST 번호 포함 시도)
    console.log('최종 회사 데이터 조회...');
    let finalCompany = await (Company as any).findOne({
      where: { 
        id: companyId,
        tenant_id: tenantId 
      }
    });

    // GST 번호 조회 시도 (테이블이 있는 경우)
    try {
      const tableCheck = await (sequelize as any).query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'company_gst_numbers'
        ) as exists;
      `, { type: QueryTypes.SELECT }) as any[];
      
      if (tableCheck && tableCheck[0] && tableCheck[0].exists) {
        // GST 번호를 포함하여 다시 조회
        finalCompany = await (Company as any).findOne({
          where: { 
            id: companyId,
            tenant_id: tenantId 
          },
          include: [{
            model: CompanyGstNumber,
            as: 'gstNumbers', // 올바른 alias 사용
            required: false
          }]
        });
        
        // GST 번호를 배열로 변환
        if (finalCompany) {
          const companyData: any = finalCompany.toJSON();
          companyData.gst_numbers = companyData.gstNumbers 
            ? companyData.gstNumbers.map((gst: any) => gst.gst_number)
            : [];
          delete companyData.gstNumbers; // 원본 alias 제거
          finalCompany = companyData;
        }
      } else {
        // 테이블이 없으면 빈 배열로 설정
        if (finalCompany) {
          const companyData: any = finalCompany.toJSON();
          companyData.gst_numbers = [];
          finalCompany = companyData;
        }
      }
    } catch (includeError: any) {
      // include 실패 시 기본 데이터만 반환
      console.log('⚠️ GST 번호 조회 실패, 기본 데이터만 반환:', includeError.message);
      if (finalCompany) {
        const companyData: any = finalCompany.toJSON();
        companyData.gst_numbers = [];
        finalCompany = companyData;
      }
    }

    console.log('✅ 회사 생성 완료');
    res.status(201).json({
      success: true,
      data: finalCompany,
      message: '회사가 성공적으로 생성되었습니다.'
    });
  } catch (error: any) {
    console.error('❌ 회사 생성 오류:', error);
    console.error('에러 스택:', error.stack);
    console.error('에러 상세:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: '회사 생성에 실패했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 회사 수정 (root 권한만)
router.put(
  '/:id',
  authenticateToken,
  validateBody({
    name: { type: 'string', minLength: 1, maxLength: 255 },
    business_number: { type: 'string', minLength: 4, maxLength: 50 },
    email: { type: 'string', maxLength: 100, pattern: emailPattern },
    phone: { type: 'string', maxLength: 50 },
    status: { type: 'string', oneOf: ['active', 'inactive', 'suspended'] }
  }),
  async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).user.tenant_id;
    const userRole = (req as any).user.role;
    const userCompanyId = (req as any).user.company_id;
    
    // root나 admin만 수정 가능, admin은 자신의 회사만 수정 가능
    if (userRole !== 'root' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '회사 정보를 수정할 권한이 없습니다.'
      });
    }
    
    // admin은 자신의 회사만 수정 가능
    if (userRole === 'admin' && userCompanyId !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: '자신이 속한 회사 정보만 수정할 수 있습니다.'
      });
    }
    
    // 요청 데이터 검증 및 정리
    const updateData = { ...req.body };
    
    // mvs_start_date, mvs_end_date를 login_period_start, login_period_end로 매핑
    if (updateData.mvs_start_date !== undefined) {
      updateData.login_period_start = updateData.mvs_start_date;
      delete updateData.mvs_start_date;
    }
    if (updateData.mvs_end_date !== undefined) {
      updateData.login_period_end = updateData.mvs_end_date;
      delete updateData.mvs_end_date;
    }
    
    // 날짜 필드 처리 (Invalid date를 null로 변환 및 날짜 형식 변환)
    if (updateData.login_period_start !== undefined) {
      if (updateData.login_period_start === 'Invalid date' || updateData.login_period_start === '' || !updateData.login_period_start) {
        updateData.login_period_start = null;
      } else if (typeof updateData.login_period_start === 'string') {
        // 문자열 날짜를 Date 객체로 변환 (YYYY-MM-DD 형식)
        try {
          const date = new Date(updateData.login_period_start);
          if (!isNaN(date.getTime())) {
            updateData.login_period_start = date;
          } else {
            updateData.login_period_start = null;
          }
        } catch (e) {
          updateData.login_period_start = null;
        }
      }
    }
    
    if (updateData.login_period_end !== undefined) {
      if (updateData.login_period_end === 'Invalid date' || updateData.login_period_end === '' || !updateData.login_period_end) {
        updateData.login_period_end = null;
      } else if (typeof updateData.login_period_end === 'string') {
        // 문자열 날짜를 Date 객체로 변환 (YYYY-MM-DD 형식)
        try {
          const date = new Date(updateData.login_period_end);
          if (!isNaN(date.getTime())) {
            updateData.login_period_end = date;
          } else {
            updateData.login_period_end = null;
          }
        } catch (e) {
          updateData.login_period_end = null;
        }
      }
    }
    
    console.log('📅 날짜 필드 처리 후:', {
      login_period_start: updateData.login_period_start,
      login_period_end: updateData.login_period_end
    });
    
    // 이미지 필드 처리 (Base64를 Buffer로 변환)
    const imageFields = ['company_logo', 'company_seal', 'ceo_signature'];
    for (const field of imageFields) {
      if (updateData[field] !== undefined) {
        if (updateData[field] === null || updateData[field] === '') {
          // 이미지 삭제
          updateData[field] = null;
        } else if (typeof updateData[field] === 'string' && updateData[field].startsWith('data:image')) {
          // Base64 이미지를 Buffer로 변환
          try {
            // data:image/jpeg;base64,/9j/4AAQ... 형식에서 base64 부분만 추출
            const base64Data = updateData[field].replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            updateData[field] = imageBuffer;
            console.log(`✅ 이미지 변환 성공: ${field}, 크기: ${imageBuffer.length} bytes`);
          } catch (error: any) {
            console.error(`❌ 이미지 변환 실패 (${field}):`, error.message);
            return res.status(400).json({
              success: false,
              message: `${field} 이미지 변환에 실패했습니다.`
            });
          }
        }
      }
    }
    
    // 빈 문자열 처리 (이미지 필드 제외)
    // address, phone, email, industry는 NOT NULL 제약조건이 있으므로 빈 문자열로 유지
    const notNullFields = ['address', 'phone', 'email', 'industry'];
    Object.keys(updateData).forEach(key => {
      if (!imageFields.includes(key)) {
        if (updateData[key] === '') {
          // NOT NULL 필드는 빈 문자열로 유지, 나머지는 null로 변환
          if (!notNullFields.includes(key)) {
            updateData[key] = null;
          }
        } else if (updateData[key] === null && notNullFields.includes(key)) {
          // null 값이 전송된 NOT NULL 필드는 빈 문자열로 변환
          updateData[key] = '';
        }
      }
    });
    
    // GST 번호 처리 (별도 테이블)
    let gstNumbers: string[] | undefined = undefined;
    if (updateData.gst_numbers !== undefined) {
      gstNumbers = Array.isArray(updateData.gst_numbers) 
        ? updateData.gst_numbers.filter((gst: string) => gst && gst.trim() !== '')
        : [];
      delete updateData.gst_numbers; // Company 테이블에는 저장하지 않음
    }
    
    // tenant_id는 업데이트하지 않음
    delete updateData.tenant_id;
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.createdAt; // camelCase 버전도 제거
    delete updateData.updatedAt; // camelCase 버전도 제거 (updated_at은 자동 업데이트됨)
    
    console.log('회사 수정 데이터:', { ...updateData, company_logo: updateData.company_logo ? `Buffer(${updateData.company_logo?.length} bytes)` : null });
    
    // DB 컬럼 길이 확인 및 자동 수정
    try {
      const [columnInfo] = await (sequelize as any).query(`
        SELECT character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'companies' 
        AND column_name = 'business_number';
      `, { type: QueryTypes.SELECT }) as any[];
      
      if (columnInfo && columnInfo.character_maximum_length && columnInfo.character_maximum_length < 50) {
        console.log(`🔧 business_number 컬럼 길이 자동 수정: ${columnInfo.character_maximum_length} -> 50`);
        await (sequelize as any).query(`
          ALTER TABLE companies 
          ALTER COLUMN business_number TYPE VARCHAR(50);
        `, { type: QueryTypes.RAW });
        console.log('✅ business_number 컬럼 길이 수정 완료');
      }
    } catch (columnFixError: any) {
      console.error('⚠️ 컬럼 길이 자동 수정 실패 (계속 진행):', columnFixError.message);
    }
    
    // 이미지 필드는 별도로 처리 (BYTEA 타입)
    const imageUpdates: any = {};
    const nonImageUpdates: any = {};
    
    Object.keys(updateData).forEach(key => {
      if (imageFields.includes(key)) {
        imageUpdates[key] = updateData[key];
      } else {
        nonImageUpdates[key] = updateData[key];
      }
    });
    
    // 이미지 컬럼 타입 확인 및 자동 수정 (VARCHAR -> BYTEA)
    for (const imageField of imageFields) {
      if (imageUpdates[imageField] !== undefined && imageUpdates[imageField] !== null) {
        try {
          const [columnInfo] = await (sequelize as any).query(`
            SELECT data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = 'companies' 
            AND column_name = '${imageField}';
          `, { type: QueryTypes.SELECT }) as any[];
          
          if (columnInfo && columnInfo.data_type === 'character varying') {
            console.log(`🔧 ${imageField} 컬럼 타입 자동 수정: VARCHAR -> BYTEA`);
            await (sequelize as any).query(`
              ALTER TABLE companies 
              ALTER COLUMN ${imageField} TYPE BYTEA USING NULL;
            `, { type: QueryTypes.RAW });
            console.log(`✅ ${imageField} 컬럼 타입 수정 완료: BYTEA`);
          }
        } catch (columnFixError: any) {
          console.error(`⚠️ ${imageField} 컬럼 타입 자동 수정 실패 (계속 진행):`, columnFixError.message);
        }
      }
    }
    
    // 일반 필드 업데이트
    if (Object.keys(nonImageUpdates).length > 0) {
      try {
        // 업데이트할 컬럼 중 알려진 누락 가능 컬럼만 체크
        const knownColumns = ['status', 'bank_address', 'swift_code', 'msme_number', 'iec_number', 'pan_number'];
        const columnsToCheck = Object.keys(nonImageUpdates).filter(key => knownColumns.includes(key));
        
        if (columnsToCheck.length > 0) {
          // 필요한 컬럼만 존재 여부 확인
          const columnChecks = await Promise.all(
            columnsToCheck.map(async (columnName) => {
              try {
                const [result] = await (sequelize as any).query(`
                  SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'companies' 
                    AND column_name = $1
                  ) as exists;
                `, {
                  bind: [columnName],
                  type: QueryTypes.SELECT
                }) as any[];
                return { columnName, exists: result?.exists || false };
              } catch (error) {
                return { columnName, exists: false };
              }
            })
          );
          
          // 누락된 컬럼만 추가
          const missingColumns = columnChecks.filter(check => !check.exists).map(check => check.columnName);
          
          if (missingColumns.length > 0) {
            console.log(`🔧 누락된 컬럼 자동 추가 중: ${missingColumns.join(', ')}`);
            
            for (const columnName of missingColumns) {
              try {
                // status 컬럼 (ENUM 타입)
                if (columnName === 'status') {
                  // ENUM 타입 확인 및 생성
                  const enumCheck = await (sequelize as any).query(`
                    SELECT EXISTS (
                      SELECT 1 FROM pg_type WHERE typname = 'company_status_enum'
                    ) as exists;
                  `, { type: QueryTypes.SELECT }) as any[];
                  
                  if (!enumCheck[0]?.exists) {
                    await (sequelize as any).query(`
                      CREATE TYPE company_status_enum AS ENUM ('active', 'inactive', 'suspended');
                    `, { type: QueryTypes.RAW });
                  }
                  
                  await (sequelize as any).query(`
                    ALTER TABLE companies 
                    ADD COLUMN IF NOT EXISTS status company_status_enum NOT NULL DEFAULT 'active';
                  `, { type: QueryTypes.RAW });
                  console.log(`✅ status 컬럼 추가 완료`);
                }
                // bank_address 컬럼
                else if (columnName === 'bank_address') {
                  await (sequelize as any).query(`
                    ALTER TABLE companies 
                    ADD COLUMN IF NOT EXISTS bank_address TEXT;
                  `, { type: QueryTypes.RAW });
                  console.log(`✅ bank_address 컬럼 추가 완료`);
                }
                // swift_code 컬럼
                else if (columnName === 'swift_code') {
                  await (sequelize as any).query(`
                    ALTER TABLE companies 
                    ADD COLUMN IF NOT EXISTS swift_code VARCHAR(11);
                  `, { type: QueryTypes.RAW });
                  console.log(`✅ swift_code 컬럼 추가 완료`);
                }
                // msme_number 컬럼
                else if (columnName === 'msme_number') {
                  await (sequelize as any).query(`
                    ALTER TABLE companies 
                    ADD COLUMN IF NOT EXISTS msme_number VARCHAR(50);
                  `, { type: QueryTypes.RAW });
                  console.log(`✅ msme_number 컬럼 추가 완료`);
                }
                // iec_number 컬럼
                else if (columnName === 'iec_number') {
                  await (sequelize as any).query(`
                    ALTER TABLE companies 
                    ADD COLUMN IF NOT EXISTS iec_number VARCHAR(50);
                  `, { type: QueryTypes.RAW });
                  console.log(`✅ iec_number 컬럼 추가 완료`);
                }
                // pan_number 컬럼
                else if (columnName === 'pan_number') {
                  await (sequelize as any).query(`
                    ALTER TABLE companies 
                    ADD COLUMN IF NOT EXISTS pan_number VARCHAR(50);
                  `, { type: QueryTypes.RAW });
                  console.log(`✅ pan_number 컬럼 추가 완료`);
                }
              } catch (addColumnError: any) {
                console.error(`❌ ${columnName} 컬럼 추가 실패:`, addColumnError.message);
              }
            }
          }
        }
        
        // 업데이트할 데이터 로그 출력
        console.log('📝 업데이트할 데이터:', {
          ...nonImageUpdates,
          login_period_start: nonImageUpdates.login_period_start,
          login_period_end: nonImageUpdates.login_period_end
        });
        
        // 날짜 필드를 DATEONLY 형식으로 변환 (YYYY-MM-DD)
        const finalUpdates = { ...nonImageUpdates };
        if (finalUpdates.login_period_start instanceof Date) {
          finalUpdates.login_period_start = finalUpdates.login_period_start.toISOString().split('T')[0];
        } else if (finalUpdates.login_period_start && typeof finalUpdates.login_period_start === 'string') {
          // 이미 YYYY-MM-DD 형식인 경우 그대로 사용
          finalUpdates.login_period_start = finalUpdates.login_period_start.split('T')[0];
        }
        
        if (finalUpdates.login_period_end instanceof Date) {
          finalUpdates.login_period_end = finalUpdates.login_period_end.toISOString().split('T')[0];
        } else if (finalUpdates.login_period_end && typeof finalUpdates.login_period_end === 'string') {
          // 이미 YYYY-MM-DD 형식인 경우 그대로 사용
          finalUpdates.login_period_end = finalUpdates.login_period_end.split('T')[0];
        }
        
        console.log('📅 최종 날짜 형식:', {
          login_period_start: finalUpdates.login_period_start,
          login_period_end: finalUpdates.login_period_end
        });
        
        // 모든 컬럼 업데이트 (Sequelize가 존재하지 않는 컬럼은 자동으로 무시)
        const updateResult = await (Company as any).update(finalUpdates, {
          where: { 
            id: parseInt(id),
            tenant_id: tenantId 
          }
        });
        
        console.log(`✅ 회사 정보 업데이트 완료 (${Object.keys(finalUpdates).length}개 필드, 영향받은 행: ${updateResult[0]})`);
      } catch (updateError: any) {
        // 컬럼이 존재하지 않는 경우를 더 명확하게 처리
        if (updateError.message && updateError.message.includes('column') && updateError.message.includes('does not exist')) {
          console.error('❌ 존재하지 않는 컬럼으로 인한 업데이트 오류:', updateError.message);
          // 존재하지 않는 컬럼을 제외하고 다시 시도
          const errorColumn = updateError.message.match(/column "(\w+)" does not exist/i)?.[1];
          if (errorColumn) {
            console.log(`🔧 존재하지 않는 컬럼 '${errorColumn}' 제외 후 재시도`);
            const retryUpdates = { ...nonImageUpdates };
            delete retryUpdates[errorColumn];
            if (Object.keys(retryUpdates).length > 0) {
              await (Company as any).update(retryUpdates, {
                where: { 
                  id: parseInt(id),
                  tenant_id: tenantId 
                }
              });
              console.log(`✅ 회사 정보 업데이트 완료 (${Object.keys(retryUpdates).length}개 필드, '${errorColumn}' 제외)`);
            }
          } else {
            throw updateError;
          }
        } else {
          console.error('❌ 회사 정보 업데이트 오류:', updateError.message);
          console.error('에러 스택:', updateError.stack);
          throw updateError;
        }
      }
    }
    
    // GST 번호 업데이트
    if (gstNumbers !== undefined) {
      try {
        // company_gst_numbers 테이블 존재 여부 확인
        const tableCheck = await (sequelize as any).query(`
          SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'company_gst_numbers'
          ) as exists;
        `, { type: QueryTypes.SELECT }) as any[];
        
        if (tableCheck && tableCheck[0] && tableCheck[0].exists) {
          // 기존 GST 번호 삭제
          await (CompanyGstNumber as any).destroy({
            where: { company_id: parseInt(id) }
          });
          
          // 새로운 GST 번호 추가
          if (gstNumbers.length > 0) {
            const gstEntries = gstNumbers.map((gst: string) => ({
              company_id: parseInt(id),
              gst_number: gst.trim(),
              status: 'active'
            }));
            await (CompanyGstNumber as any).bulkCreate(gstEntries);
          }
          console.log('✅ GST 번호 업데이트 완료');
        } else {
          console.log('⚠️ company_gst_numbers 테이블이 존재하지 않습니다. GST 번호 업데이트를 건너뜁니다.');
        }
      } catch (gstError: any) {
        // 테이블이 없는 경우 등 에러는 무시하고 계속 진행
        if (gstError.code === '42P01') {
          console.log('⚠️ company_gst_numbers 테이블이 존재하지 않습니다. GST 번호 업데이트를 건너뜁니다.');
        } else {
          console.error('GST 번호 업데이트 오류:', gstError.message);
        }
      }
    }
    
    // 이미지 필드 업데이트 (BYTEA 타입)
    if (Object.keys(imageUpdates).length > 0) {
      for (const [field, value] of Object.entries(imageUpdates)) {
        if (value === null) {
          // 이미지 삭제
          await (sequelize as any).query(
            `UPDATE companies SET ${field} = NULL WHERE id = $1 AND tenant_id = $2`,
            {
              bind: [parseInt(id), tenantId],
              type: QueryTypes.UPDATE
            }
          );
        } else if (Buffer.isBuffer(value)) {
          // 이미지 업데이트 (BYTEA) - hex 형식으로 변환
          const hexString = '\\x' + value.toString('hex');
          await (sequelize as any).query(
            `UPDATE companies SET ${field} = $1::bytea WHERE id = $2 AND tenant_id = $3`,
            {
              bind: [hexString, parseInt(id), tenantId],
              type: QueryTypes.UPDATE
            }
          );
          console.log(`✅ ${field} 이미지 업데이트 완료`);
        }
      }
    }
    
    // 회사 정보 조회 (GST 번호 포함 시도)
    let updatedCompany = await (Company as any).findOne({
      where: { 
        id: parseInt(id),
        tenant_id: tenantId 
      }
    });

    // GST 번호 조회 시도 (테이블이 있는 경우)
    try {
      const tableCheck = await (sequelize as any).query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'company_gst_numbers'
        ) as exists;
      `, { type: QueryTypes.SELECT }) as any[];
      
      if (tableCheck && tableCheck[0] && tableCheck[0].exists) {
        // GST 번호를 포함하여 다시 조회
        updatedCompany = await (Company as any).findOne({
          where: { 
            id: parseInt(id),
            tenant_id: tenantId 
          },
          include: [{
            model: CompanyGstNumber,
            as: 'gstNumbers', // 올바른 alias 사용
            required: false
          }]
        });
        
        // GST 번호를 배열로 변환
        if (updatedCompany) {
          const companyData: any = updatedCompany.toJSON();
          companyData.gst_numbers = companyData.gstNumbers 
            ? companyData.gstNumbers.map((gst: any) => gst.gst_number)
            : [];
          delete companyData.gstNumbers; // 원본 alias 제거
          updatedCompany = companyData;
        }
      } else {
        // 테이블이 없으면 빈 배열로 설정
        if (updatedCompany) {
          const companyData: any = updatedCompany.toJSON();
          companyData.gst_numbers = [];
          updatedCompany = companyData;
        }
      }
    } catch (includeError: any) {
      // include 실패 시 기본 데이터만 반환
      console.log('⚠️ GST 번호 조회 실패, 기본 데이터만 반환:', includeError.message);
      if (updatedCompany) {
        const companyData: any = updatedCompany.toJSON();
        companyData.gst_numbers = [];
        updatedCompany = companyData;
      }
    }

    res.json({
      success: true,
      data: updatedCompany,
      message: '회사 정보가 성공적으로 수정되었습니다.'
    });
  } catch (error: any) {
    console.error('회사 수정 오류:', error);
    console.error('에러 스택:', error.stack);
    res.status(500).json({
      success: false,
      message: '회사 수정에 실패했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DB 컬럼 길이 수정 (root 권한만, 개발용)
router.post('/fix-column-lengths', authenticateToken, requireRole(['root']), async (req, res) => {
  try {
    console.log('🔧 DB 컬럼 길이 수정 시작...');
    
    // business_number 컬럼 길이 변경
    await (sequelize as any).query(`
      ALTER TABLE companies 
      ALTER COLUMN business_number TYPE VARCHAR(50);
    `, { type: QueryTypes.RAW });
    
    console.log('✅ business_number 컬럼 길이 변경 완료: VARCHAR(20) -> VARCHAR(50)');
    
    // 변경 후 확인
    const [columnInfo] = await (sequelize as any).query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'companies' 
      AND column_name = 'business_number';
    `, { type: QueryTypes.SELECT }) as any[];
    
    res.json({
      success: true,
      message: '컬럼 길이 수정 완료',
      columnInfo: columnInfo
    });
  } catch (error: any) {
    console.error('❌ 컬럼 길이 수정 오류:', error.message);
    res.status(500).json({
      success: false,
      message: '컬럼 길이 수정에 실패했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 회사 삭제 (root 권한만)
router.delete('/:id', authenticateToken, requireRole(['root']), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).user.tenant_id;
    
    const deletedRowsCount = await (Company as any).destroy({
      where: { 
        id: id,
        tenant_id: tenantId 
      }
    });

    if (deletedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        message: '회사를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '회사가 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('회사 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '회사 삭제에 실패했습니다.'
    });
  }
});

export default router;

