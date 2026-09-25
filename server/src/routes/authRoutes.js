import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  me,
} from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter, strictSensitiveLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Allow-list validation: explicit type/length/character-set constraints, reject on failure.
const emailField = body('email').isEmail().normalizeEmail().isLength({ max: 254 });

// Password policy: length + complexity. Rejects on failure rather than silently truncating.
const strongPasswordField = (field) =>
  body(field)
    .isString()
    .isLength({ min: 12, max: 128 })
    .matches(/[a-z]/)
    .withMessage('Password must contain a lowercase letter.')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter.')
    .matches(/\d/)
    .withMessage('Password must contain a digit.')
    .matches(/[^A-Za-z0-9]/)
    .withMessage('Password must contain a special character.');

const opaqueTokenField = body('token').isString().isLength({ min: 32, max: 256 }).matches(/^[a-f0-9]+$/i);

router.post(
  '/register',
  authLimiter,
  [
    emailField,
    strongPasswordField('password'),
    body('displayName').isString().trim().isLength({ min: 1, max: 100 }).escape(),
  ],
  validate,
  register,
);

router.post(
  '/verify-email',
  authLimiter,
  [emailField, opaqueTokenField],
  validate,
  verifyEmail,
);

router.post(
  '/resend-verification',
  strictSensitiveLimiter,
  [emailField],
  validate,
  resendVerification,
);

router.post(
  '/login',
  authLimiter,
  [emailField, body('password').isString().isLength({ min: 1, max: 128 })],
  validate,
  login,
);

router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);

router.post(
  '/forgot-password',
  strictSensitiveLimiter,
  [emailField],
  validate,
  forgotPassword,
);

router.post(
  '/reset-password',
  authLimiter,
  [emailField, opaqueTokenField, strongPasswordField('newPassword')],
  validate,
  resetPassword,
);

router.post(
  '/change-password',
  requireAuth,
  authLimiter,
  [
    body('currentPassword').isString().isLength({ min: 1, max: 128 }),
    strongPasswordField('newPassword'),
  ],
  validate,
  changePassword,
);

router.get('/me', requireAuth, me);

export default router;
