import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { expenseController } from '../controllers/expenseController';
import { validateRequestBody, isGroupMember } from '../middleware/authMiddleware';
import { authMiddleware } from '../config/passport';
import * as joi from 'joi';

export const expenseRouter = express.Router();

// Setup file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    cb(null, fileName);
  },
});

const upload = multer({ 
  storage, 
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Validation schemas
const createExpenseSchema = joi.object({
  groupId: joi.number().required(),
  amount: joi.number().positive().required(),
  description: joi.string().required(),
  date: joi.date().required(),
  shares: joi.object().pattern(
    joi.string().pattern(/^\d+$/), // User IDs as keys
    joi.number().positive() // Share amounts as values
  ).required(),
  paidById: joi.number().optional(), // Allow specifying who paid for the expense
});

const updateExpenseSchema = joi.object({
  description: joi.string(),
  date: joi.date(),
});

// All expense routes require authentication
expenseRouter.use(authMiddleware.jwt);

// Routes
// Create a new expense
expenseRouter.post('/', validateRequestBody(createExpenseSchema), expenseController.createExpense);

// Upload receipt for an expense
expenseRouter.post('/:expenseId/receipt', upload.single('receipt'), expenseController.uploadReceipt);

// Get expenses for a group
expenseRouter.get('/group/:groupId', isGroupMember, expenseController.getGroupExpenses);

// Get recent expenses for user across all groups
expenseRouter.get('/recent', expenseController.getRecentUserExpenses);

// Get expense details
expenseRouter.get('/:expenseId', expenseController.getExpenseDetails);

// Update an expense
expenseRouter.put('/:expenseId', validateRequestBody(updateExpenseSchema), expenseController.updateExpense);

// Delete an expense
expenseRouter.delete('/:expenseId', expenseController.deleteExpense);

// Mark an expense share as paid
expenseRouter.patch('/shares/:shareId/paid', expenseController.markSharePaid);
