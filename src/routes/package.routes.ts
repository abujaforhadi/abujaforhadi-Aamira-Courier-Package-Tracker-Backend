import { Router } from 'express';
import { createPackageEvent, getPackages, getPackage, updatePackageStatus } from '../controllers/package.controller';
import { authenticateApiKey } from '../middleware/auth.middleware';

const router = Router();

// router.use(authenticateApiKey);

router.post('/packages/new', createPackageEvent);

router.get('/packages', getPackages);

router.get('/packages/:id', getPackage);

router.put('/packages/:id/status', updatePackageStatus);

export default router;