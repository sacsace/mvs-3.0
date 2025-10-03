import { Router } from 'express';
import {
  getPayrolls,
  getPayroll,
  createPayroll,
  updatePayroll,
  deletePayroll,
} from '../controllers/hrController';

const router = Router();

// 급여 관련 라우트
router.get('/payrolls', getPayrolls);
router.get('/payrolls/:id', getPayroll);
router.post('/payrolls', createPayroll);
router.put('/payrolls/:id', updatePayroll);
router.delete('/payrolls/:id', deletePayroll);

export default router;
