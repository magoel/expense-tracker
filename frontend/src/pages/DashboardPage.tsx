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
  TextField,
  InputAdornment,
  Pagination,
  FormControl,
  Select,
  MenuItem,
  Tab,
  Tabs,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Group as GroupIcon,
  Receipt as ReceiptIcon,
  ArrowForward as ArrowForwardIcon,
  Search as SearchIcon,
  Payments as PaymentsIcon,
  AccountBalance as AccountBalanceIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';

import { api } from '../api';
import { formatCurrency } from '../utils/formatters';
import { format } from 'date-fns';

interface Group {
  id: number;
  name: string;
  currency: string;
  membersCount?: number;
}

interface Expense {
  id: number;
  description: string;
  amount: number | string;
  date: string;
  createdAt: string;
  group: {
    name: string;
    id: number;
    currency: string;
  };
  paidBy: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
}

interface Payment {
  id: number;
  description?: string;
  amount: number | string;
  date: string;
  createdAt: string;
  group: {
    name: string;
    id: number;
    currency: string;
  };
  payer: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
  receiver: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
}

interface ActivityItem {
  id: number;
  type: 'expense' | 'payment';
  date: string;
  amount: number | string;
  description: string;
  data: Expense | Payment;
}

interface Balance {
  groupId: number;
  groupName: string;
  balance: number;
  currency: string;
}

interface PaginationMeta {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

const DashboardPage = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [allActivityItems, setAllActivityItems] = useState<ActivityItem[]>([]); // For search filtering
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState({
    groups: true,
    activity: true,
    balances: true,
  });
  const [error, setError] = useState<string | null>(null);
  
  // Activity state
  const [searchTerm, setSearchTerm] = useState('');
  const [activityType, setActivityType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 5
  });
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch user's groups
        const groupsResponse = await api.get('/groups');
        setGroups(groupsResponse.data.data.groups);
        setLoading(prev => ({ ...prev, groups: false }));

        // If user has groups, fetch activity and balances
        if (groupsResponse.data.data.groups.length > 0) {
          // Fetch balances across all groups
          const balancesResponse = await api.get('/stats/user-balances');
          setBalances(balancesResponse.data.data.balances);
          setLoading(prev => ({ ...prev, balances: false }));
          
          // Fetch activity data
          await fetchActivityData();
        } else {
          setLoading({
            groups: false,
            activity: false,
            balances: false,
          });
        }
      } catch (err) {
        setError('Failed to load dashboard data');
        setLoading({
          groups: false,
          activity: false,
          balances: false,
        });
      }
    };

    const fetchActivityData = async () => {
      setLoading(prev => ({ ...prev, activity: true }));
      try {
        // Fetch expenses
        const expensesResponse = await api.get('/expenses/recent', {
          params: { 
            limit: 100, // Get more initially for client-side filtering/pagination
            page: 1
          }
        });
        
        const expenses = expensesResponse.data.data.expenses.map((expense: Expense) => ({
          id: expense.id,
          type: 'expense' as const,
          date: expense.date,
          amount: expense.amount,
          description: expense.description,
          data: expense
        }));
        
        // Fetch payments
        const paymentsResponse = await api.get('/payments/recent', {
          params: {
            limit: 100, // Get more initially for client-side filtering/pagination
            page: 1
          }
        });
        
        const payments = paymentsResponse.data.data.payments.map((payment: Payment) => ({
          id: payment.id,
          type: 'payment' as const,
          date: payment.date,
          amount: payment.amount,
          description: payment.description || 'Payment',
          data: payment
        }));
        
        // Combine and sort by date (newest first)
        const combined = [...expenses, ...payments].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        setAllActivityItems(combined);
        
        // Set pagination meta
        setPaginationMeta({
          totalCount: combined.length,
          totalPages: Math.ceil(combined.length / pageSize),
          currentPage: page,
          limit: pageSize
        });
        
        // Apply initial filtering and pagination
        applyFiltersAndPagination(combined);
        
      } catch (err) {
        console.error('Failed to fetch activity data:', err);
      } finally {
        setLoading(prev => ({ ...prev, activity: false }));
      }
    };

    fetchDashboardData();
  }, []);
  
  // Apply search filters and pagination
  const applyFiltersAndPagination = (items = allActivityItems) => {
    let filteredItems = [...items];
    
    // Apply search if term exists
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredItems = filteredItems.filter(item => {
        // Search in description
        if (item.description.toLowerCase().includes(searchLower)) return true;
        
        // Search in amount
        if (parseFloat(item.amount.toString()).toString().includes(searchLower)) return true;
        
        // Search in group name
        if (item.type === 'expense') {
          const expense = item.data as Expense;
          if (expense.group.name.toLowerCase().includes(searchLower)) return true;
        } else {
          const payment = item.data as Payment;
          if (payment.group.name.toLowerCase().includes(searchLower)) return true;
        }
        
        return false;
      });
    }
    
    // Apply type filter
    if (activityType !== 'all') {
      filteredItems = filteredItems.filter(item => item.type === activityType);
    }
    
    // Update pagination metadata
    setPaginationMeta({
      totalCount: filteredItems.length,
      totalPages: Math.ceil(filteredItems.length / pageSize),
      currentPage: page,
      limit: pageSize
    });
    
    // Apply pagination
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    setActivityItems(filteredItems.slice(start, end));
  };

  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1); // Reset to first page when searching
  };
  
  // Effect for search filtering
  useEffect(() => {
    applyFiltersAndPagination();
  }, [searchTerm, activityType, page, pageSize]);
  
  // Handle page change
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };
  
  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
    setActivityType(newValue === 0 ? 'all' : (newValue === 1 ? 'expense' : 'payment'));
    setPage(1);
  };

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

          {/* Recent Activity Section */}
          <Grid item xs={12}>
            <Card>
              <CardHeader 
                title="Recent Activity" 
                action={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      component={RouterLink}
                      to="/payments/new"
                      startIcon={<PaymentsIcon />}
                      size="small"
                      variant="outlined"
                    >
                      New Payment
                    </Button>
                    <Button
                      component={RouterLink}
                      to="/expenses/new"
                      startIcon={<AddIcon />}
                      size="small"
                      variant="contained"
                      color="primary"
                    >
                      New Expense
                    </Button>
                  </Box>
                }
              />
              <Divider />
              
              {/* Search and filter bar */}
              <Box sx={{ px: 2, pt: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      placeholder="Search by description, amount, or group"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Tabs
                        value={selectedTab}
                        onChange={handleTabChange}
                        aria-label="activity type tabs"
                        indicatorColor="primary"
                        textColor="primary"
                      >
                        <Tab label="All" />
                        <Tab label="Expenses" />
                        <Tab label="Payments" />
                      </Tabs>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
              
              <CardContent sx={{ pt: 1 }}>
                {loading.activity ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : activityItems.length > 0 ? (
                  <>
                    <List>
                      {activityItems.map((item) => {
                        if (item.type === 'expense') {
                          const expense = item.data as Expense;
                          return (
                            <ListItem
                              key={`expense-${item.id}`}
                              button
                              component={RouterLink}
                              to={`/expenses/${item.id}`}
                              divider
                            >
                              <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}>
                                <ReceiptIcon />
                              </Avatar>
                              <ListItemText 
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography variant="body1">{expense.description}</Typography>
                                    <Chip 
                                      label={expense.group.name} 
                                      size="small" 
                                      variant="outlined" 
                                      sx={{ ml: 1 }}
                                    />
                                  </Box>
                                }
                                secondaryTypographyProps={{ component: 'div' }}
                                secondary={
                                  <>
                                    <Typography variant="body2" component="span">
                                      Paid by {expense.paidBy.firstName} {expense.paidBy.lastName}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" component="div">
                                      {format(new Date(expense.date), 'MMM d, yyyy')}
                                    </Typography>
                                  </>
                                }
                              />
                              <Typography 
                                variant="body1"
                                fontWeight="bold"
                              >
                                {formatCurrency(parseFloat(expense.amount.toString()), expense.group.currency)}
                              </Typography>
                            </ListItem>
                          );
                        } else {
                          const payment = item.data as Payment;
                          return (
                            <ListItem
                              key={`payment-${item.id}`}
                              divider
                            >
                              <Avatar sx={{ mr: 2, bgcolor: 'success.main' }}>
                                <AccountBalanceIcon />
                              </Avatar>
                              <ListItemText 
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography variant="body1">{payment.description || 'Payment'}</Typography>
                                    <Chip 
                                      label={payment.group.name} 
                                      size="small" 
                                      variant="outlined" 
                                      sx={{ ml: 1 }}
                                    />
                                  </Box>
                                }
                                secondaryTypographyProps={{ component: 'div' }}
                                secondary={
                                  <>
                                    <Typography variant="body2" component="span">
                                      {payment.payer.firstName} {payment.payer.lastName} → {payment.receiver.firstName} {payment.receiver.lastName}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" component="div">
                                      {format(new Date(payment.date), 'MMM d, yyyy')}
                                    </Typography>
                                  </>
                                }
                              />
                              <Typography 
                                variant="body1"
                                fontWeight="bold"
                                color="success.main"
                              >
                                {formatCurrency(parseFloat(payment.amount.toString()), payment.group.currency)}
                              </Typography>
                            </ListItem>
                          );
                        }
                      })}
                    </List>
                    
                    {/* Pagination */}
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                      <Pagination 
                        count={paginationMeta.totalPages} 
                        page={page}
                        onChange={handlePageChange} 
                        color="primary" 
                      />
                    </Box>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    {searchTerm ? 'No results match your search' : 'No recent activity'}
                  </Typography>
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
