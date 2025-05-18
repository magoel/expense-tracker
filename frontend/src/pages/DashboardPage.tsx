import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Avatar,
  Paper,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Group as GroupIcon,
  Receipt as ReceiptIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';

import { api } from '../api';
import { formatCurrency } from '../utils/formatters';

interface Group {
  id: number;
  name: string;
  currency: string;
  membersCount?: number;
}

interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string;
  group: {
    name: string;
    id: number;
  };
  paidBy: {
    firstName: string;
    lastName: string;
  };
}

interface Balance {
  groupId: number;
  groupName: string;
  balance: number;
  currency: string;
}

const DashboardPage = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState({
    groups: true,
    expenses: true,
    balances: true,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch user's groups
        const groupsResponse = await api.get('/groups');
        setGroups(groupsResponse.data.data.groups);
        setLoading(prev => ({ ...prev, groups: false }));

        // If user has groups, fetch recent expenses and balances
        if (groupsResponse.data.data.groups.length > 0) {
          // Fetch recent expenses across all groups
          const expensesResponse = await api.get('/expenses/recent');
          setRecentExpenses(expensesResponse.data.data.expenses);
          setLoading(prev => ({ ...prev, expenses: false }));

          // Fetch balances across all groups
          const balancesResponse = await api.get('/stats/user-balances');
          setBalances(balancesResponse.data.data.balances);
          setLoading(prev => ({ ...prev, balances: false }));
        } else {
          setLoading({
            groups: false,
            expenses: false,
            balances: false,
          });
        }
      } catch (err) {
        setError('Failed to load dashboard data');
        setLoading({
          groups: false,
          expenses: false,
          balances: false,
        });
      }
    };

    fetchDashboardData();
  }, []);

  if (loading.groups) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Dashboard</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {groups.length === 0 ? (
        <EmptyDashboard />
      ) : (
        <Grid container spacing={3}>
          {/* Groups Section */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader 
                title="Your Groups" 
                action={
                  <Button
                    component={RouterLink}
                    to="/groups/new"
                    startIcon={<AddIcon />}
                    size="small"
                  >
                    New Group
                  </Button>
                }
              />
              <Divider />
              <CardContent>
                <List>
                  {groups.slice(0, 5).map((group) => (
                    <ListItem
                      key={group.id}
                      button
                      component={RouterLink}
                      to={`/groups/${group.id}`}
                      divider
                    >
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        <GroupIcon />
                      </Avatar>
                      <ListItemText 
                        primary={group.name} 
                        secondary={`${group.membersCount || 0} members`} 
                      />
                      <ListItemSecondaryAction>
                        <ArrowForwardIcon color="action" />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
                {groups.length > 5 && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button
                      component={RouterLink}
                      to="/groups"
                      size="small"
                    >
                      View All Groups
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Balances Section */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Your Balances" />
              <Divider />
              <CardContent>
                {loading.balances ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : balances.length > 0 ? (
                  <List>
                    {balances.map((balance) => (
                      <ListItem
                        key={balance.groupId}
                        button
                        component={RouterLink}
                        to={`/groups/${balance.groupId}`}
                        divider
                      >
                        <ListItemText 
                          primary={balance.groupName} 
                        />
                        <Typography 
                          color={balance.balance > 0 ? 'success.main' : balance.balance < 0 ? 'error.main' : 'text.secondary'}
                          variant="body1"
                          fontWeight="bold"
                        >
                          {formatCurrency(balance.balance, balance.currency)}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    No balance information available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Expenses Section */}
          <Grid item xs={12}>
            <Card>
              <CardHeader 
                title="Recent Expenses" 
                action={
                  <Button
                    component={RouterLink}
                    to="/expenses/new"
                    startIcon={<AddIcon />}
                    size="small"
                  >
                    New Expense
                  </Button>
                }
              />
              <Divider />
              <CardContent>
                {loading.expenses ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : recentExpenses.length > 0 ? (
                  <List>
                    {recentExpenses.map((expense) => (
                      <ListItem
                        key={expense.id}
                        button
                        component={RouterLink}
                        to={`/expenses/${expense.id}`}
                        divider
                      >
                        <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}>
                          <ReceiptIcon />
                        </Avatar>
                        <ListItemText 
                          primary={expense.description} 
                          secondary={`${expense.group.name} • Paid by ${expense.paidBy.firstName} ${expense.paidBy.lastName}`}
                        />
                        <Typography 
                          variant="body1"
                          fontWeight="bold"
                        >
                          {formatCurrency(expense.amount, 'USD')}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    No recent expenses
                  </Typography>
                )}
                {recentExpenses.length > 0 && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button
                      component={RouterLink}
                      to="/expenses"
                      size="small"
                    >
                      View All Expenses
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

// Component to show when user has no groups
const EmptyDashboard = () => {
  return (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <GroupIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        Welcome to Group Expense Tracker!
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        You haven't joined any groups yet. Create a new group to get started or join an existing one with a group code.
      </Typography>
      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          component={RouterLink}
          to="/groups/new"
          startIcon={<AddIcon />}
          sx={{ mr: 2 }}
        >
          Create Group
        </Button>
        <Button
          variant="outlined"
          component={RouterLink}
          to="/groups/join"
        >
          Join Group
        </Button>
      </Box>
    </Paper>
  );
};

export default DashboardPage;
