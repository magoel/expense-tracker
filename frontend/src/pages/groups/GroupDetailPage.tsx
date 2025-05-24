import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Divider,
  List,
  ListItem,
  ListItemText,
  Button,
  Stack,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  ListItemAvatar,
  TextField,
  InputAdornment,
  Pagination,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  PeopleAlt, 
  Payments, 
  Add, 
  ArrowBack, 
  Receipt, 
  AccountBalance,
  Person,
  Search,
  FilterList
} from '@mui/icons-material';
import { api } from '../../api';
import { format } from 'date-fns';

interface Group {
  id: number;
  name: string;
  description: string;
  code: string;
  creatorId: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  memberships?: Membership[];
}

interface Membership {
  id: number;
  userId: number;
  groupId: number;
  status: string;
  joinedAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
}

interface Expense {
  id: number;
  groupId: number;
  paidById: number;
  amount: number | string; // API might return as string or number
  description: string;
  date: string;
  createdAt: string;
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
  groupId: number;
  payerId: number;
  receiverId: number;
  amount: number | string; // API might return as string or number
  description?: string;
  date: string;
  createdAt: string;
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
  amount: number | string; // API might return as string or number
  description: string;
  data: Expense | Payment;
}

interface PendingMembership {
  id: number;
  userId: number;
  groupId: number;
  status: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
}

interface PaginationMeta {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

const GroupDetailPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingMembership[]>([]);
  const [pendingRequestsLoading, setPendingRequestsLoading] = useState(false);
  const [processingMembershipId, setProcessingMembershipId] = useState<number | null>(null);
  const [membershipActionFeedback, setMembershipActionFeedback] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [allActivityItems, setAllActivityItems] = useState<ActivityItem[]>([]); // For search filtering
  const [recentActivityLoading, setRecentActivityLoading] = useState(false);
  
  // New state for pagination and search
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 5
  });
  const [activityType, setActivityType] = useState<string>('all');

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/groups/${groupId}`);
        setGroup(response.data.data.group);
        setError(null);
        
        // If user is the group creator, fetch pending requests
        if (response.data.data.group.creatorId === response.data.data.currentUser?.id) {
          fetchPendingRequests();
        }
      } catch (err) {
        console.error('Failed to fetch group details:', err);
        setError('Failed to load group details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    const fetchPendingRequests = async () => {
      try {
        setPendingRequestsLoading(true);
        const response = await api.get('/groups/pending-requests');
        
        // Filter requests for the current group
        const currentGroupRequests = response.data.data.pendingRequests.filter(
          (request: PendingMembership) => request.groupId === parseInt(groupId || '0')
        );
        
        setPendingRequests(currentGroupRequests);
      } catch (err) {
        console.error('Failed to fetch pending requests:', err);
      } finally {
        setPendingRequestsLoading(false);
      }
    };

    if (groupId) {
      fetchGroup();
    }
  }, [groupId, loading]);

  useEffect(() => {
    const fetchAllActivity = async () => {
      if (!groupId) return;
      
      setRecentActivityLoading(true);
      
      try {
        // Fetch all expenses (no pagination for initial load)
        const expensesResponse = await api.get(`/expenses/group/${groupId}`, {
          params: { limit: 100 } // Get more expenses initially
        });
        
        const expenses = expensesResponse.data.data.expenses.map((expense: Expense) => ({
          id: expense.id,
          type: 'expense' as const,
          date: expense.date,
          amount: expense.amount,
          description: expense.description,
          data: expense
        }));
        
        // Fetch all payments
        const paymentsResponse = await api.get(`/payments/group/${groupId}`);
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
        
        // Apply pagination
        applyFiltersAndPagination(combined);
      } catch (err) {
        console.error('Failed to fetch activity data:', err);
      } finally {
        setRecentActivityLoading(false);
      }
    };
    
    if (!loading && group) {
      fetchAllActivity();
    }
  }, [groupId, group, loading, page, pageSize]);

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
        
        // Search in user names
        if (item.type === 'expense') {
          const expense = item.data as Expense;
          const paidByName = `${expense.paidBy.firstName} ${expense.paidBy.lastName}`.toLowerCase();
          if (paidByName.includes(searchLower)) return true;
        } else {
          const payment = item.data as Payment;
          const payerName = `${payment.payer.firstName} ${payment.payer.lastName}`.toLowerCase();
          const receiverName = `${payment.receiver.firstName} ${payment.receiver.lastName}`.toLowerCase();
          if (payerName.includes(searchLower) || receiverName.includes(searchLower)) return true;
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
  
  // Handle page size change
  const handlePageSizeChange = (event: SelectChangeEvent<number>) => {
    setPageSize(event.target.value as number);
    setPage(1); // Reset to first page when changing page size
  };
  
  // Handle activity type filter change
  const handleActivityTypeChange = (event: SelectChangeEvent<string>) => {
    setActivityType(event.target.value);
    setPage(1); // Reset to first page when changing filter
  };
  
  // Handle membership request approval
  const handleApproveRequest = async (membershipId: number) => {
    try {
      setProcessingMembershipId(membershipId);
      await api.patch(`/groups/memberships/${membershipId}`, { action: 'approve' });
      
      // Remove from pending requests
      setPendingRequests(prev => prev.filter(req => req.id !== membershipId));
      
      // Refresh group data to show new member
      const response = await api.get(`/groups/${groupId}`);
      setGroup(response.data.data.group);
      
      setMembershipActionFeedback({ 
        message: 'Membership request approved successfully', 
        type: 'success' 
      });
      
      // Clear feedback after 3 seconds
      setTimeout(() => {
        setMembershipActionFeedback(null);
      }, 3000);
    } catch (err) {
      console.error('Failed to approve membership request:', err);
      setMembershipActionFeedback({ 
        message: 'Failed to approve membership request', 
        type: 'error' 
      });
    } finally {
      setProcessingMembershipId(null);
    }
  };
  
  // Handle membership request rejection
  const handleRejectRequest = async (membershipId: number) => {
    try {
      setProcessingMembershipId(membershipId);
      await api.patch(`/groups/memberships/${membershipId}`, { action: 'reject' });
      
      // Remove from pending requests
      setPendingRequests(prev => prev.filter(req => req.id !== membershipId));
      
      setMembershipActionFeedback({ 
        message: 'Membership request rejected', 
        type: 'success' 
      });
      
      // Clear feedback after 3 seconds
      setTimeout(() => {
        setMembershipActionFeedback(null);
      }, 3000);
    } catch (err) {
      console.error('Failed to reject membership request:', err);
      setMembershipActionFeedback({ 
        message: 'Failed to reject membership request', 
        type: 'error' 
      });
    } finally {
      setProcessingMembershipId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/groups')}
          sx={{ mt: 2 }}
        >
          Back to Groups
        </Button>
      </Container>
    );
  }

  if (!group) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="info">Group not found</Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/groups')}
          sx={{ mt: 2 }}
        >
          Back to Groups
        </Button>
      </Container>
    );
  }

  // Format user's name
  const formatUserName = (user: { firstName: string; lastName: string }) => {
    return `${user.firstName} ${user.lastName}`;
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  // Render expense item
  const renderExpenseItem = (expense: Expense) => {
    return (
      <>
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <Receipt />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Typography variant="body1">
              {expense.description}
            </Typography>
          }
          secondary={
            <>
              <Typography component="span" variant="body2" color="text.primary">
                {formatUserName(expense.paidBy)} paid {group.currency} {parseFloat(expense.amount.toString()).toFixed(2)}
              </Typography>
              <Typography component="span" variant="body2" display="block" color="text.secondary">
                {formatDate(expense.date)}
              </Typography>
            </>
          }
        />
        <Button 
          size="small" 
          onClick={() => navigate(`/expenses/${expense.id}`)}
        >
          Details
        </Button>
      </>
    );
  };
  
  // Render payment item
  const renderPaymentItem = (payment: Payment) => {
    return (
      <>
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: 'success.main' }}>
            <AccountBalance />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Typography variant="body1">
              {payment.description || 'Payment'}
            </Typography>
          }
          secondary={
            <>
              <Typography component="span" variant="body2" color="text.primary">
                {formatUserName(payment.payer)} paid {formatUserName(payment.receiver)} {group.currency} {parseFloat(payment.amount.toString()).toFixed(2)}
              </Typography>
              <Typography component="span" variant="body2" display="block" color="text.secondary">
                {formatDate(payment.date)}
              </Typography>
            </>
          }
        />
      </>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/groups')}
        >
          Back to Groups
        </Button>

        <Stack direction="row" spacing={2}>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<Add />}
            onClick={() => navigate(`/expenses/new?groupId=${groupId}`)}
          >
            Add Expense
          </Button>
          <Button 
            variant="outlined" 
            color="primary" 
            startIcon={<Payments />}
            onClick={() => navigate(`/payments/new?groupId=${groupId}`)}
          >
            Record Payment
          </Button>
        </Stack>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {group.name}
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          {group.description || 'No description provided'}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mt: 2, mb: 3 }}>
          <Chip 
            label={`Group Code: ${group.code}`} 
            color="primary" 
            variant="outlined" 
          />
          <Chip 
            icon={<PeopleAlt />} 
            label={`${group.memberships?.length || 0} Members`} 
            variant="outlined" 
          />
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Members
              </Typography>
              
              <Divider sx={{ my: 1 }} />
              
              {/* Membership action feedback */}
              {membershipActionFeedback && (
                <Alert 
                  severity={membershipActionFeedback.type} 
                  sx={{ mb: 2 }}
                >
                  {membershipActionFeedback.message}
                </Alert>
              )}
              
              {/* Pending Membership Requests */}
              {pendingRequestsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : pendingRequests.length > 0 && (
                <>
                  <Box sx={{ mb: 2, mt: 1 }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Pending Requests
                    </Typography>
                    <List>
                      {pendingRequests.map((request) => (
                        <ListItem 
                          key={`pending-${request.id}`}
                          secondaryAction={
                            <Box>
                              <Button 
                                size="small" 
                                color="primary"
                                onClick={() => handleApproveRequest(request.id)}
                                sx={{ mr: 1 }}
                                disabled={processingMembershipId === request.id}
                              >
                                Approve
                              </Button>
                              <Button 
                                size="small"
                                color="error"
                                onClick={() => handleRejectRequest(request.id)}
                                disabled={processingMembershipId === request.id}
                              >
                                Reject
                              </Button>
                            </Box>
                          }
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'warning.light' }}>
                              <Person />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary={`${request.user.firstName} ${request.user.lastName}`}
                            secondary={request.user.email}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                    <Divider sx={{ my: 1 }} />
                  </Box>
                </>
              )}
              
              {/* Active Members List */}
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {pendingRequests.length > 0 ? 'Active Members' : ''}
              </Typography>
              <List>
                {group?.memberships && group.memberships.length > 0 ? (
                  group.memberships.map((membership) => (
                    <ListItem key={membership.id}>
                      <ListItemAvatar>
                        <Avatar>
                          <Person />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={`${membership.user.firstName} ${membership.user.lastName}`} 
                        secondary={membership.user.email} 
                      />
                    </ListItem>
                  ))
                ) : (
                  <ListItem>
                    <ListItemText primary="No members found" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={7}>
                    <TextField
                      fullWidth
                      placeholder="Search by description, amount, or user"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <FormControl fullWidth size="small">
                      <Select
                        value={activityType}
                        onChange={handleActivityTypeChange}
                        displayEmpty
                        startAdornment={
                          <InputAdornment position="start">
                            <FilterList fontSize="small" />
                          </InputAdornment>
                        }
                      >
                        <MenuItem value="all">All Activity</MenuItem>
                        <MenuItem value="expense">Expenses Only</MenuItem>
                        <MenuItem value="payment">Payments Only</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
              
              <Divider sx={{ my: 1 }} />
              
              {recentActivityLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : activityItems.length > 0 ? (
                <>
                  <List>
                    {activityItems.map(item => (
                      <ListItem 
                        key={`${item.type}-${item.id}`}
                        alignItems="flex-start"
                        divider
                      >
                        {item.type === 'expense' 
                          ? renderExpenseItem(item.data as Expense)
                          : renderPaymentItem(item.data as Payment)
                        }
                      </ListItem>
                    ))}
                  </List>
                  
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <FormControl variant="outlined" size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={pageSize}
                        onChange={handlePageSizeChange}
                      >
                        <MenuItem value={5}>5</MenuItem>
                        <MenuItem value={10}>10</MenuItem>
                        <MenuItem value={25}>25</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <Pagination 
                      count={paginationMeta.totalPages} 
                      page={page}
                      onChange={handlePageChange} 
                      color="primary" 
                      size="medium"
                    />
                    
                    <Typography variant="body2" color="text.secondary">
                      {`${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, paginationMeta.totalCount)} of ${paginationMeta.totalCount}`}
                    </Typography>
                  </Box>
                </>
              ) : (
                <Box sx={{ py: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    No activity found {searchTerm ? 'with the current filter' : ''}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default GroupDetailPage;
