import { Request, Response } from 'express';
import { Op, Sequelize, fn, col, literal, ProjectionAlias } from 'sequelize';
import { Expense, ExpenseShare, Payment, User, Group, GroupMember } from '../models';
import { asyncHandler } from '../middleware/errorHandler';

export const statsController = {
  // Get expense summary for a group
  getGroupExpenseSummary: asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const { timeFrame = 'monthly' } = req.query;
    
    let dateFormat: string;
    let group: string[];
    let order: string[];
    
    // Set up time frame formatting
    switch (timeFrame) {
      case 'daily':
        dateFormat = 'YYYY-MM-DD';
        group = ['date'];
        order = ['date'];
        break;
      case 'weekly':
        dateFormat = 'IYYY-IW'; // ISO year and week
        group = ['year', 'week'];
        order = ['year', 'week'];
        break;
      case 'yearly':
        dateFormat = 'YYYY';
        group = ['year'];
        order = ['year'];
        break;
      case 'monthly':
      default:
        dateFormat = 'YYYY-MM';
        group = ['year', 'month'];
        order = ['year', 'month'];
        break;
    }
    
    // Get expenses grouped by time period
    const expenseAttributes: any[] = [
      [fn('to_char', col('date'), dateFormat), 'period'],
      [fn('date_part', 'year', col('date')), 'year']
    ];
    
    if (timeFrame === 'monthly') {
      expenseAttributes.push([fn('date_part', 'month', col('date')), 'month']);
    } else if (timeFrame === 'weekly') {
      expenseAttributes.push([fn('date_part', 'week', col('date')), 'week']);
    }
    
    expenseAttributes.push([fn('sum', col('Expense.amount')), 'total']);
    
    const expenses = await Expense.findAll({
      attributes: expenseAttributes,
      where: { groupId },
      group,
      order: order.map(field => [field, 'ASC']),
      raw: true,
    });
    
    // Get expenses by payer
    const expensesByPayer = await Expense.findAll({
      attributes: [
        [col('paidById'), 'userId'],
        [fn('sum', col('Expense.amount')), 'total'],
      ],
      where: { groupId },
      group: ['paidById'],
      include: [
        {
          model: User,
          as: 'paidBy',
          attributes: ['firstName', 'lastName'],
        },
      ],
      raw: true,
      nest: true,
    });
    
    res.status(200).json({
      success: true,
      data: {
        timeSeriesData: expenses,
        byPayer: expensesByPayer,
      },
    });
  }),
  
  // Get user balance in a group
  getGroupBalances: asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    
    // Calculate what each user has paid (positive)
    const paidExpenses = await Expense.findAll({
      attributes: [
        'paidById',
        [fn('sum', col('Expense.amount')), 'paidAmount'],
      ],
      where: { groupId },
      group: ['paidById'],
      raw: true,
    });
    
    // Calculate what each user owes (negative)
    const owedShares = await ExpenseShare.findAll({
      attributes: [
        'userId',
        [fn('sum', col('ExpenseShare.amount')), 'owedAmount'],
      ],
      include: [
        {
          model: Expense,
          as: 'expense',
          attributes: [],
          where: { groupId },
        },
      ],
      group: ['userId'],
      raw: true,
    });
    
    // Calculate payments made by each user (negative)
    const paymentsSent = await Payment.findAll({
      attributes: [
        'payerId',
        [fn('sum', col('Payment.amount')), 'sentAmount'],
      ],
      where: { groupId },
      group: ['payerId'],
      raw: true,
    });
    
    // Calculate payments received by each user (positive)
    const paymentsReceived = await Payment.findAll({
      attributes: [
        'receiverId',
        [fn('sum', col('Payment.amount')), 'receivedAmount'],
      ],
      where: { groupId },
      group: ['receiverId'],
      raw: true,
    });
    
    // Get all users in group
    const users = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
      include: [
        {
          model: ExpenseShare,
          as: 'expenseShares',
          attributes: [],
          include: [
            {
              model: Expense,
              as: 'expense',
              attributes: [],
              where: { groupId },
            },
          ],
        },
      ],
      group: ['User.id'],
      raw: true,
    });
    
    // Calculate overall balance for each user
    const balances = users.map(user => {
      const userId = user.id;
      
      // Amounts paid for expenses
      const paid = paidExpenses.find(expense => expense.paidById === userId);
      const paidAmount = parseFloat((paid as any)?.paidAmount || 0);
      
      // Amounts owed for expenses
      const owed = owedShares.find(share => share.userId === userId);
      const owedAmount = parseFloat((owed as any)?.owedAmount || 0);
      
      // Payments sent
      const sent = paymentsSent.find(payment => payment.payerId === userId);
      const sentAmount = parseFloat((sent as any)?.sentAmount || 0);
      
      // Payments received
      const received = paymentsReceived.find(payment => payment.receiverId === userId);
      const receivedAmount = parseFloat((received as any)?.receivedAmount || 0);
      
      // Calculate balance: (paid + sent) - (received + owed)
      const balance = (paidAmount + sentAmount) - (receivedAmount + owedAmount);
      
      return {
        ...user,
        paidAmount,
        owedAmount,
        sentAmount,
        receivedAmount,
        balance: parseFloat(balance.toFixed(2)), // Round to 2 decimal places
      };
    });
    
    res.status(200).json({
      success: true,
      data: {
        balances,
      },
    });
  }),
  
  // Get optimized payment suggestions
  getPaymentSuggestions: asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    
    // Get all user balances (same as getGroupBalances)
    // ... (use the same calculation logic from getGroupBalances)
    
    // Then apply a debt simplification algorithm
    // This is a simplified version - a proper implementation would use min-cost flow
    const balances = await getBalances(groupId);
    
    // Separate positive (creditors) and negative (debtors) balances
    const creditors = balances
      .filter(b => b.balance > 0)
      .sort((a, b) => b.balance - a.balance);
      
    const debtors = balances
      .filter(b => b.balance < 0)
      .sort((a, b) => a.balance - b.balance); // Sort by most negative first
    
    const paymentSuggestions: any[] = [];
    
    // Simplify debts
    let i = 0, j = 0;
    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i];
      const debtor = debtors[j];
      
      // Remove rounding errors
      const creditorAmount = parseFloat(creditor.balance.toFixed(2));
      const debtorAmount = parseFloat(Math.abs(debtor.balance).toFixed(2));
      
      // Calculate payment amount (minimum of the two)
      const paymentAmount = Math.min(creditorAmount, debtorAmount);
      
      if (paymentAmount > 0) {
        paymentSuggestions.push({
          from: {
            id: debtor.id,
            name: `${debtor.firstName} ${debtor.lastName}`,
          },
          to: {
            id: creditor.id,
            name: `${creditor.firstName} ${creditor.lastName}`,
          },
          amount: paymentAmount,
        });
        
        // Update balances
        creditor.balance -= paymentAmount;
        debtor.balance += paymentAmount;
      }
      
      // Move to next user if balance is settled
      if (Math.abs(creditor.balance) < 0.01) i++;
      if (Math.abs(debtor.balance) < 0.01) j++;
    }
    
    res.status(200).json({
      success: true,
      data: {
        paymentSuggestions,
      },
    });
  }),
  
  // Get user balances across all groups
  getUserBalances: asyncHandler(async (req: Request, res: Response) => {
    // Get the current user ID from the request
    const userId = (req.user as any)?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Get all groups that the user is a member of
    let memberGroups: any[] = [];
    try {
      memberGroups = await GroupMember.findAll({
        where: {
          userId,
          status: 'active'
        },
        attributes: ['groupId'],
        raw: true
      });
    } catch (err) {
      console.error('Error fetching member groups:', err);
      memberGroups = [];
    }
    
    const groupIds = memberGroups.map((member: any) => member.groupId);
    
    if (groupIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          balances: []
        }
      });
    }
    
    // For each group, calculate the user's balance
    const balancePromises = groupIds.map(async (groupId: number) => {
      try {
        // Get group info
        const group = await Group.findByPk(groupId, {
          attributes: ['id', 'name', 'currency'],
          raw: true
        });
        
        if (!group) {
          return null;
        }
        
        // Calculate what user has paid (positive)
        let paidExpenses;
        try {
          paidExpenses = await Expense.findOne({
            attributes: [
              [fn('COALESCE', fn('sum', col('Expense.amount')), 0), 'paidAmount']
            ],
            where: { 
              groupId,
              paidById: userId
            },
            raw: true
          });
        } catch (err) {
          console.log('Error fetching paid expenses, setting to default value of 0');
          paidExpenses = { paidAmount: 0 };
        }
        
        // Calculate what user owes (negative)
        let owedShares;
        try {
          owedShares = await ExpenseShare.findOne({
            attributes: [
              [fn('COALESCE', fn('sum', col('ExpenseShare.amount')), 0), 'owedAmount']
            ],
            where: {
              userId
            },
            include: [
              {
                model: Expense,
                as: 'expense',
                attributes: [],
                where: { groupId }
              }
            ],
            raw: true
          });
        } catch (err) {
          console.log('Error fetching owed shares, setting to default value of 0');
          owedShares = { owedAmount: 0 };
        }
        
        // Calculate payments sent by user (negative)
        let paymentsSent;
        try {
          paymentsSent = await Payment.findOne({
            attributes: [
              [fn('COALESCE', fn('sum', col('Payment.amount')), 0), 'sentAmount']
            ],
            where: {
              groupId,
              payerId: userId
            },
            raw: true
          });
        } catch (err) {
          console.log('Error fetching payments sent, setting to default value of 0');
          paymentsSent = { sentAmount: 0 };
        }
        
        // Calculate payments received by user (positive)
        let paymentsReceived;
        try {
          paymentsReceived = await Payment.findOne({
            attributes: [
              [fn('COALESCE', fn('sum', col('Payment.amount')), 0), 'receivedAmount']
            ],
            where: {
              groupId,
              receiverId: userId
            },
            raw: true
          });
        } catch (err) {
          console.log('Error fetching payments received, setting to default value of 0');
          paymentsReceived = { receivedAmount: 0 };
        }
        
        // Calculate balance: (paid + sent) - (received + owed)
        const paidAmount = parseFloat((paidExpenses as any)?.paidAmount || 0);
        const owedAmount = parseFloat((owedShares as any)?.owedAmount || 0);
        const sentAmount = parseFloat((paymentsSent as any)?.sentAmount || 0);
        const receivedAmount = parseFloat((paymentsReceived as any)?.receivedAmount || 0);
        
        const balance = (paidAmount + sentAmount) - (receivedAmount + owedAmount);
        
        return {
          groupId: group.id,
          groupName: group.name,
          balance: parseFloat(balance.toFixed(2)), // Round to 2 decimal places
          currency: group.currency
        };
      } catch (error) {
        console.error(`Error calculating balance for group ${groupId}:`, error);
        return null;
      }
    });
    
    // Remove any null results
    const balances = (await Promise.all(balancePromises))
      .filter(balance => balance !== null);
    
    res.status(200).json({
      success: true,
      data: {
        balances
      }
    });
  }),
};

// Helper function to get balances
async function getBalances(groupId: string | number) {
  // Calculate what each user has paid (positive)
  let paidExpenses: any[] = [];
  try {
    paidExpenses = await Expense.findAll({
      attributes: [
        'paidById',
        [fn('sum', col('Expense.amount')), 'paidAmount'],
      ],
      where: { groupId },
      group: ['paidById'],
      raw: true,
    });
  } catch (err) {
    console.error('Error fetching paid expenses in getBalances:', err);
    paidExpenses = [];
  }
  
  // Calculate what each user owes (negative)
  let owedShares: any[] = [];
  try {
    owedShares = await ExpenseShare.findAll({
      attributes: [
        'userId',
        [fn('sum', col('ExpenseShare.amount')), 'owedAmount'],
      ],
      include: [
        {
          model: Expense,
          as: 'expense',
          attributes: [],
          where: { groupId },
        },
      ],
      group: ['userId'],
      raw: true,
    });
  } catch (err) {
    console.error('Error fetching owed shares in getBalances:', err);
    owedShares = [];
  }
  
  // Calculate payments made by each user (negative)
  let paymentsSent: any[] = [];
  try {
    paymentsSent = await Payment.findAll({
      attributes: [
        'payerId',
        [fn('sum', col('Payment.amount')), 'sentAmount'],
      ],
      where: { groupId },
      group: ['payerId'],
      raw: true,
    });
  } catch (err) {
    console.error('Error fetching payments sent in getBalances:', err);
    paymentsSent = [];
  }
  
  // Calculate payments received by each user (positive)
  let paymentsReceived: any[] = [];
  try {
    paymentsReceived = await Payment.findAll({
      attributes: [
        'receiverId',
        [fn('sum', col('Payment.amount')), 'receivedAmount'],
      ],
      where: { groupId },
      group: ['receiverId'],
      raw: true,
    });
  } catch (err) {
    console.error('Error fetching payments received in getBalances:', err);
    paymentsReceived = [];
  }
  
  // Get all users in group
  let users: any[] = [];
  try {
    users = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
      include: [
        {
          model: ExpenseShare,
          as: 'expenseShares',
          attributes: [],
          include: [
            {
              model: Expense,
              as: 'expense',
              attributes: [],
              where: { groupId },
            },
          ],
        },
      ],
      group: ['User.id'],
      raw: true,
    });
  } catch (err) {
    console.error('Error fetching users in getBalances:', err);
    users = [];
  }
  
  // Calculate overall balance for each user
  return users.map(user => {
    const userId = user.id;
    
    // Amounts paid for expenses
    const paid = paidExpenses.find(expense => expense.paidById === userId);
    const paidAmount = parseFloat((paid as any)?.paidAmount || 0);
    
    // Amounts owed for expenses
    const owed = owedShares.find(share => share.userId === userId);
    const owedAmount = parseFloat((owed as any)?.owedAmount || 0);
    
    // Payments sent
    const sent = paymentsSent.find(payment => payment.payerId === userId);
    const sentAmount = parseFloat((sent as any)?.sentAmount || 0);
    
    // Payments received
    const received = paymentsReceived.find(payment => payment.receiverId === userId);
    const receivedAmount = parseFloat((received as any)?.receivedAmount || 0);
    
    // Calculate balance: (paid + sent) - (received + owed)
    const balance = (paidAmount + sentAmount) - (receivedAmount + owedAmount);
    
    return {
      ...user,
      paidAmount,
      owedAmount,
      sentAmount,
      receivedAmount,
      balance: parseFloat(balance.toFixed(2)), // Round to 2 decimal places
    };
  });
}
