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
  ListItemSecondaryAction,
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

interface PaymentSuggestion {
  from: {
    id: number;
    name: string;
  };
  to: {
    id: number;
    name: string;
  };
  amount: number;
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
  const [paymentSuggestions, setPaymentSuggestions] = useState<PaymentSuggestion[]>([]);
  const [loadingPaymentSuggestions, setLoadingPaymentSuggestions] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [allActivityItems, setAllActivityItems] = useState<ActivityItem[]>([]); // For search filtering
  const [recentActivityLoading, setRecentActivityLoading] = useState(false);
  
  // New state for pagination and search
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10
  });
  const [activityType, setActivityType] = useState<string>('all');
  const activityListRef = React.useRef<HTMLDivElement>(null);

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

        // Fetch payment suggestions
        fetchPaymentSuggestions();
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

    const fetchPaymentSuggestions = async () => {
      if (!groupId) return;
      
      try {
        setLoadingPaymentSuggestions(true);
        const response = await api.get(`/stats/group/${groupId}/payment-suggestions`);
        setPaymentSuggestions(response.data.data.paymentSuggestions || []);
      } catch (err) {
        console.error('Failed to fetch payment suggestions:', err);
        setPaymentSuggestions([]);
      } finally {
        setLoadingPaymentSuggestions(false);
      }
    };

    if (groupId) {
      fetchGroup();
    }
  }, [groupId, loading]);

  // Initial data loading
  useEffect(() => {
    const fetchInitialActivity = async () => {
      if (!groupId) return;
      
      setRecentActivityLoading(true);
      setPage(1); // Reset to first page when component loads
      setHasMoreItems(true);
      setActivityItems([]);
      setAllActivityItems([]);
      
      try {
        // Fetch initial batch of expenses
        const expensesResponse = await api.get(`/expenses/group/${groupId}`, {
          params: { limit: itemsPerPage * 2 } // Get more initially to have buffer
        });
        
        const expenses = expensesResponse.data.data.expenses.map((expense: Expense) => ({
          id: expense.id,
          type: 'expense' as const,
          date: expense.date,
          amount: expense.amount,
          description: expense.description,
          data: expense
        }));
        
        // Fetch initial batch of payments
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
          totalPages: Math.ceil(combined.length / itemsPerPage),
          currentPage: 1,
          limit: itemsPerPage
        });
        
        // Apply initial filters
        applyFiltersAndPagination(combined, 1);
        
        // If we got fewer items than requested, there are no more to load
        if (combined.length < itemsPerPage) {
          setHasMoreItems(false);
        }
      } catch (err) {
        console.error('Failed to fetch activity data:', err);
      } finally {
        setRecentActivityLoading(false);
      }
    };
    
    if (!loading && group) {
      fetchInitialActivity();
    }
  }, [groupId, group, loading, itemsPerPage, searchTerm, activityType]);
  
  // Function to load more items when user scrolls
  const loadMoreItems = React.useCallback(() => {
    if (isLoadingMore || !hasMoreItems) return;
    
    setIsLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    
    // Apply filters and pagination for the next page
    applyFiltersAndPagination(allActivityItems, nextPage, true);
    
    setIsLoadingMore(false);
  }, [page, hasMoreItems, isLoadingMore, allActivityItems]);

  // Apply search filters and pagination with support for infinite scrolling
  const applyFiltersAndPagination = (items = allActivityItems, currentPage = page, appendItems = false) => {
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
      totalPages: Math.ceil(filteredItems.length / itemsPerPage),
      currentPage: currentPage,
      limit: itemsPerPage
    });
    
    // Apply pagination
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const newItems = filteredItems.slice(start, end);
    
    // Check if there are more items to load
    setHasMoreItems(end < filteredItems.length);
    
    // Either append the new items or replace existing ones
    if (appendItems) {
      setActivityItems(prevItems => [...prevItems, ...newItems]);
    } else {
      setActivityItems(newItems);
    }
  };

  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1); // Reset to first page when searching
    // Reset the activity items when searching
    applyFiltersAndPagination(allActivityItems, 1, false);
  };
  
  // Handle activity type filter change
  const handleActivityTypeChange = (event: SelectChangeEvent<string>) => {
    setActivityType(event.target.value);
    setPage(1); // Reset to first page when changing filter
    // Reset the activity items when filtering
    applyFiltersAndPagination(allActivityItems, 1, false);
  };
  
  // Setup intersection observer for infinite scroll
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '20px',
      threshold: 0.1,
    };
    
    const observer = new IntersectionObserver((entries) => {
      const target = entries[0];
      if (target.isIntersecting && hasMoreItems && !isLoadingMore && !recentActivityLoading) {
        loadMoreItems();
      }
    }, options);
    
    const sentinelElement = activityListRef.current;
    if (sentinelElement) {
      observer.observe(sentinelElement);
    }
    
    return () => {
      if (sentinelElement) {
        observer.unobserve(sentinelElement);
      }
    };
  }, [loadMoreItems, hasMoreItems, isLoadingMore, recentActivityLoading]);
  
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/groups')}
        >
          Back to Groups
        </Button>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<Add />}
            onClick={() => navigate(`/expenses/new?groupId=${groupId}`)}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Add Expense
          </Button>
          <Button 
            variant="outlined" 
            color="primary" 
            startIcon={<Payments />}
            onClick={() => navigate(`/payments/new?groupId=${groupId}`)}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Record Payment
          </Button>
        </Stack>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {group.name}
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 2 }}>
          {group.description || 'No description provided'}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mt: 2, mb: 1, flexWrap: 'wrap' }}>
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
        <Grid item xs={12} lg={6}>
          {/* Payment Suggestions Card */}
          <Card sx={{ height: 'fit-content' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment Suggestions
              </Typography>
              
              <Divider sx={{ my: 1 }} />
              
              {loadingPaymentSuggestions ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : paymentSuggestions.length > 0 ? (
                <List>
                  {paymentSuggestions.map((suggestion, index) => (
                    <ListItem 
                      key={`suggestion-${index}`}
                      sx={{ 
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          borderRadius: 1
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'info.main' }}>
                          <Payments />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ pr: 24 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
                              <Typography variant="body1" sx={{ fontSize: '0.95rem' }}>
                                {suggestion.from.name} should pay {suggestion.to.name}
                              </Typography>
                            </Box>
                            <Chip 
                              label={`${group.currency} ${suggestion.amount.toFixed(2)}`}
                              color="primary"
                              size="small"
                              sx={{ minWidth: '80px', fontSize: '0.85rem' }}
                            />
                          </Box>
                        }
                        secondary={`Based on current group balances`}
                      />
                      <ListItemSecondaryAction sx={{ right: 16, top: '50%', transform: 'translateY(-50%)' }} >
                        <Button 
                          variant="contained" 
                          color="primary"
                          size="small"
                          startIcon={<Payments />}
                          onClick={() => navigate(`/payments/new?groupId=${groupId}&amount=${suggestion.amount}&fromId=${suggestion.from.id}&toId=${suggestion.to.id}`)}
                          sx={{ 
                            minWidth: 'auto',
                            fontSize: '0.8rem',
                            px: 2,
                            py: 0.5
                          }}
                        >
                          Record Payment
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No payment suggestions available. All balances are settled.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
          
          {/* Members Card */}
          <Card sx={{ height: 'fit-content' }}>
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
                          <ListItemSecondaryAction>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button 
                                size="small" 
                                color="primary"
                                variant="contained"
                                onClick={() => handleApproveRequest(request.id)}
                                disabled={processingMembershipId === request.id}
                                sx={{ minWidth: 'auto', px: 2 }}
                              >
                                Approve
                              </Button>
                              <Button 
                                size="small"
                                color="error"
                                variant="outlined"
                                onClick={() => handleRejectRequest(request.id)}
                                disabled={processingMembershipId === request.id}
                                sx={{ minWidth: 'auto', px: 2 }}
                              >
                                Reject
                              </Button>
                            </Box>
                          </ListItemSecondaryAction>
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
        
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: 'fit-content' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={7}>
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
                  <Grid item xs={12} md={5}>
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
                    
                    {/* Loading indicator and sentinel element for intersection observer */}
                    <Box 
                      ref={activityListRef}
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        py: 2, 
                        mt: 1
                      }}
                    >
                      {isLoadingMore && (
                        <CircularProgress size={24} sx={{ color: 'primary.main' }} />
                      )}
                      
                      {!hasMoreItems && activityItems.length > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          — End of list —
                        </Typography>
                      )}
                    </Box>
                  </List>
                  
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                      {`Showing ${activityItems.length} of ${paginationMeta.totalCount} items`}
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
