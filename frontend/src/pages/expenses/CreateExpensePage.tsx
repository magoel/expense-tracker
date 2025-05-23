import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Grid,
  Paper,
  InputAdornment,
  Alert,
  CircularProgress,
  FormHelperText,
  SelectChangeEvent,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../api';
import { DatePicker } from '@mui/x-date-pickers';
// Removed dayjs import

interface Group {
  id: number;
  name: string;
  currency: string;
  memberships?: {
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
  }[];
}

interface ExpenseShare {
  userId: number;
  amount: number;
  name: string;
  email: string;
}

const CreateExpensePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const searchParams = new URLSearchParams(location.search);
  const groupIdParam = searchParams.get('groupId');

  // State
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>(0);
  const [date, setDate] = useState<Date | null>(new Date());
  const [receipt, setReceipt] = useState<File | null>(null);
  const [splitMethod, setSplitMethod] = useState('equal');
  const [shares, setShares] = useState<ExpenseShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch groups on mount
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await api.get('/groups');
        setGroups(response.data.data.groups);
        
        // If groupId is in URL, select that group
        if (groupIdParam) {
          const selectedGroup = response.data.data.groups.find(
            (g: Group) => g.id === parseInt(groupIdParam)
          );
          
          if (selectedGroup) {
            handleGroupSelect(selectedGroup.id);
          }
        }
        
        setLoadingGroups(false);
      } catch (error) {
        console.error('Error fetching groups', error);
        setLoadingGroups(false);
      }
    };
    
    fetchGroups();
  }, [groupIdParam]);
  
  // Handle group selection
  const handleGroupSelect = async (groupId: number) => {
    try {
      // Fetch group details with members
      const response = await api.get(`/groups/${groupId}`);
      const group = response.data.data.group;
      
      setSelectedGroup(group);
      
      // Process members from memberships
      if (group.memberships && group.memberships.length > 0) {
        const members = group.memberships.map((membership: any) => membership.user);
        
        // ALWAYS initialize shares with all members (equal split by default)
        const currentAmount = amount || 0;
        const equalAmount = currentAmount / members.length;
        const newShares = members.map((member: any) => ({
          userId: member.id,
          amount: parseFloat(equalAmount.toFixed(2)),
          name: `${member.firstName} ${member.lastName}`,
          email: member.email
        }));
        
        setShares(newShares);
        console.log('Shares initialized:', newShares);
      } else {
        console.warn('Group has no members to split expense with');
      }
    } catch (error) {
      console.error('Error fetching group details', error);
    }
  };
  
  // Handle group change
  const handleGroupChange = (event: SelectChangeEvent<number>) => {
    handleGroupSelect(event.target.value as number);
  };
  
  // Handle amount change
  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = event.target.value === '' ? '' : parseFloat(event.target.value);
    setAmount(newAmount);
    
    // Update shares if using equal split
    if (selectedGroup && selectedGroup.memberships && selectedGroup.memberships.length > 0) {
      // Always update shares when amount changes, but respect the split method
      if (splitMethod === 'equal' && newAmount !== '') {
        const members = selectedGroup.memberships.map((membership: any) => membership.user);
        const equalAmount = newAmount / members.length;
        const newShares = members.map((member: any) => ({
          userId: member.id,
          amount: parseFloat(equalAmount.toFixed(2)),
          name: `${member.firstName} ${member.lastName}`,
          email: member.email
        }));
        
        console.log('Shares updated due to amount change:', newShares);
        setShares(newShares);
      }
    } else {
      console.warn('Cannot update shares: No group selected or group has no members');
    }
  };
  
  // Handle split method change
  const handleSplitMethodChange = (event: SelectChangeEvent<string>) => {
    const newSplitMethod = event.target.value;
    setSplitMethod(newSplitMethod);
    
    if (newSplitMethod === 'equal' && selectedGroup && amount !== '' && selectedGroup.memberships) {
      // Set equal shares
      const members = selectedGroup.memberships.map(membership => membership.user);
      const equalAmount = (amount as number) / members.length;
      const newShares = members.map(member => ({
        userId: member.id,
        amount: parseFloat(equalAmount.toFixed(2)),
        name: `${member.firstName} ${member.lastName}`,
        email: member.email
      }));
      
      setShares(newShares);
    } else if (newSplitMethod === 'exact' && selectedGroup && selectedGroup.memberships) {
      // Initialize exact shares with zero
      const members = selectedGroup.memberships.map(membership => membership.user);
      const newShares = members.map(member => ({
        userId: member.id,
        amount: 0,
        name: `${member.firstName} ${member.lastName}`,
        email: member.email
      }));
      
      setShares(newShares);
    }
  };
  
  // Handle share amount change
  const handleShareAmountChange = (userId: number, value: string) => {
    const newAmount = value === '' ? 0 : parseFloat(value);
    
    const newShares = shares.map(share => {
      if (share.userId === userId) {
        return { ...share, amount: newAmount };
      }
      return share;
    });
    
    setShares(newShares);
  };
  
  // Handle receipt upload
  const handleReceiptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setReceipt(event.target.files[0]);
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!selectedGroup) {
      newErrors.group = 'Please select a group';
    }
    
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!amount || amount <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    
    if (!date) {
      newErrors.date = 'Date is required';
    }
    
    // Check if shares exist
    if (shares.length === 0) {
      newErrors.shares = 'No members to split expense with';
    } else if (splitMethod === 'exact') {
      const totalShareAmount = shares.reduce((sum, share) => sum + share.amount, 0);
      if (Math.abs(totalShareAmount - (amount || 0)) > 0.01) {
        newErrors.shares = 'The sum of shares must equal the expense amount';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setSubmitError(null);
      
      // Prepare share data
      let sharesToUse = [...shares]; // Create a copy of the current shares
      
      // If shares array is empty and a group is selected, calculate shares immediately (not using state)
      if (sharesToUse.length === 0 && selectedGroup && selectedGroup.memberships) {
        const members = selectedGroup.memberships.map(membership => membership.user);
        const equalAmount = (amount as number) / members.length;
        sharesToUse = members.map(member => ({
          userId: member.id,
          amount: parseFloat(equalAmount.toFixed(2)),
          name: `${member.firstName} ${member.lastName}`,
          email: member.email
        }));
        // Update state for UI, but don't rely on it for API call
        setShares(sharesToUse);
      }
      
      // Prepare share data from our local array, not from state
      const shareData: Record<number, number> = {};
      sharesToUse.forEach(share => {
        shareData[share.userId] = share.amount;
      });
      
      // Ensure shares are not empty
      if (Object.keys(shareData).length === 0) {
        throw new Error("No shares found. Please ensure expense is split among group members.");
      }
      
      // Create expense
      const createResponse = await api.post('/expenses', {
        groupId: selectedGroup?.id,
        amount,
        description,
        date: date ? date.toISOString() : new Date().toISOString(),
        shares: shareData
      });
      
      const expenseId = createResponse.data.data.expense.id;
      
      // Upload receipt if available
      if (receipt && expenseId) {
        const formData = new FormData();
        formData.append('receipt', receipt);
        
        await api.post(`/expenses/${expenseId}/receipt`, formData);
      }
      
      // Navigate to group detail page
      navigate(`/groups/${selectedGroup?.id}`);
    } catch (error: any) {
      console.error('Error creating expense', error);
      setSubmitError(error.response?.data?.message || 'Failed to create expense');
      setLoading(false);
    }
  };
  
  // Calculate remaining amount for exact split
  const calculateRemainingAmount = () => {
    const totalShareAmount = shares.reduce((sum, share) => sum + share.amount, 0);
    return ((amount || 0) - totalShareAmount).toFixed(2);
  };
  
  if (loadingGroups) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 2 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Create Expense</Typography>
      
      {submitError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError}
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Expense Details</Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth error={!!errors.group}>
                  <InputLabel id="group-label">Group</InputLabel>
                  <Select
                    labelId="group-label"
                    id="group"
                    value={selectedGroup?.id || ''}
                    label="Group"
                    onChange={handleGroupChange}
                    disabled={!!groupIdParam}
                  >
                    {groups.map((group) => (
                      <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
                    ))}
                  </Select>
                  {errors.group && <FormHelperText>{errors.group}</FormHelperText>}
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  error={!!errors.description}
                  helperText={errors.description}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={amount}
                  onChange={handleAmountChange}
                  InputProps={{
                    startAdornment: selectedGroup ? (
                      <InputAdornment position="start">{selectedGroup.currency}</InputAdornment>
                    ) : undefined
                  }}
                  error={!!errors.amount}
                  helperText={errors.amount}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Date"
                  value={date}
                  onChange={(newDate) => setDate(newDate)}
                />
                {errors.date && (
                  <FormHelperText error>{errors.date}</FormHelperText>
                )}
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<ReceiptIcon />}
                  sx={{ mt: 1 }}
                >
                  {receipt ? 'Change Receipt' : 'Upload Receipt'}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleReceiptChange}
                  />
                </Button>
                {receipt && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {receipt.name}
                  </Typography>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        {selectedGroup && selectedGroup.memberships && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Split Details</Typography>
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel id="split-method-label">Split Method</InputLabel>
                  <Select
                    labelId="split-method-label"
                    id="split-method"
                    value={splitMethod}
                    label="Split Method"
                    onChange={handleSplitMethodChange}
                  >
                    <MenuItem value="equal">Equal</MenuItem>
                    <MenuItem value="exact">Exact amounts</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              {errors.shares && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errors.shares}
                </Alert>
              )}
              
              {splitMethod === 'equal' ? (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Each person pays {selectedGroup.currency} {((amount || 0) / selectedGroup.memberships.length).toFixed(2)}
                </Typography>
              ) : (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color={calculateRemainingAmount() === '0.00' ? 'success.main' : 'error.main'}>
                    {amount && amount > 0 ? (
                      <>
                        {calculateRemainingAmount() === '0.00' 
                          ? '✓ All shares assigned' 
                          : `${selectedGroup.currency} ${calculateRemainingAmount()} remaining to be assigned`}
                      </>
                    ) : (
                      'Enter an amount first'
                    )}
                  </Typography>
                </Box>
              )}
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {shares.map((share) => (
                  <Grid item xs={12} key={share.userId}>
                    <Paper sx={{ p: 2 }}>
                      <Grid container alignItems="center" spacing={2}>
                        <Grid item xs={6} md={8}>
                          <Typography>
                            {share.name}
                            {share.userId === user?.id && ' (you)'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {share.email}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={4}>
                          {splitMethod === 'exact' ? (
                            <TextField
                              fullWidth
                              label="Amount"
                              type="number"
                              value={share.amount || ''}
                              onChange={(e) => handleShareAmountChange(share.userId, e.target.value)}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">{selectedGroup.currency}</InputAdornment>
                                )
                              }}
                            />
                          ) : (
                            <Typography align="right" fontWeight="bold">
                              {selectedGroup.currency} {share.amount.toFixed(2)}
                            </Typography>
                          )}
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            type="button" 
            onClick={() => navigate(-1)} 
            sx={{ mr: 2 }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Expense'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default CreateExpensePage;
