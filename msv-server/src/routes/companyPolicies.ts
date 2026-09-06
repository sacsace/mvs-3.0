import { Router } from 'express';
import { authenticateToken, requireRole, restrictAuditToReadOnly } from '../middleware/auth';
import {
  getCompanyPolicy,
  getCompanyPolicyRevision,
  listCompanyPolicies,
  listCompanyPolicyHistory,
  updateCompanyPolicy,
} from '../controllers/companyPolicyController';

const router = Router();

router.use(authenticateToken);

router.get('/', listCompanyPolicies);
router.get('/:key', getCompanyPolicy);
router.get('/:key/history', listCompanyPolicyHistory);
router.get('/:key/history/:version', getCompanyPolicyRevision);
router.put(
  '/:key',
  restrictAuditToReadOnly,
  requireRole(['admin', 'root']),
  updateCompanyPolicy
);

export default router;
