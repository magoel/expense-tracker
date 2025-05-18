import User from './User';
import Group from './Group';
import GroupMember from './GroupMember';
import Expense from './Expense';
import ExpenseShare from './ExpenseShare';
import Payment from './Payment';

// Define model associations
User.hasMany(Group, {
  foreignKey: 'creatorId',
  as: 'createdGroups',
});

Group.belongsTo(User, {
  foreignKey: 'creatorId',
  as: 'creator',
});

User.belongsToMany(Group, {
  through: GroupMember,
  foreignKey: 'userId',
  otherKey: 'groupId',
  as: 'groups',
});

Group.belongsToMany(User, {
  through: GroupMember,
  foreignKey: 'groupId',
  otherKey: 'userId',
  as: 'members',
});

Group.hasMany(GroupMember, {
  foreignKey: 'groupId',
  as: 'memberships',
});

GroupMember.belongsTo(Group, {
  foreignKey: 'groupId',
  as: 'group',
});

GroupMember.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Group.hasMany(Expense, {
  foreignKey: 'groupId',
  as: 'expenses',
});

Expense.belongsTo(Group, {
  foreignKey: 'groupId',
  as: 'group',
});

User.hasMany(Expense, {
  foreignKey: 'paidById',
  as: 'paidExpenses',
});

Expense.belongsTo(User, {
  foreignKey: 'paidById',
  as: 'paidBy',
});

Expense.hasMany(ExpenseShare, {
  foreignKey: 'expenseId',
  as: 'shares',
});

ExpenseShare.belongsTo(Expense, {
  foreignKey: 'expenseId',
  as: 'expense',
});

User.hasMany(ExpenseShare, {
  foreignKey: 'userId',
  as: 'expenseShares',
});

ExpenseShare.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Group.hasMany(Payment, {
  foreignKey: 'groupId',
  as: 'payments',
});

Payment.belongsTo(Group, {
  foreignKey: 'groupId',
  as: 'group',
});

User.hasMany(Payment, {
  foreignKey: 'payerId',
  as: 'sentPayments',
});

Payment.belongsTo(User, {
  foreignKey: 'payerId',
  as: 'payer',
});

User.hasMany(Payment, {
  foreignKey: 'receiverId',
  as: 'receivedPayments',
});

Payment.belongsTo(User, {
  foreignKey: 'receiverId',
  as: 'receiver',
});

export {
  User,
  Group,
  GroupMember,
  Expense,
  ExpenseShare,
  Payment,
};
