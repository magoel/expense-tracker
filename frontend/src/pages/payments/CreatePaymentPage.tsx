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
  Grid,
  InputAdornment,
  Alert,
  CircularProgress,
  FormHelperText,
  SelectChangeEvent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../api';

interface Group {
  id: number;
  name: string;
  currency: string;
  members?: GroupMember[];
  memberships?: GroupMember[]; // Adding this field as it might be what the backend returns
}

interface GroupMember {
  id: number;
  userId: number;
  groupId: number;
  status: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface Balance {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  balance: number;
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

const CreatePaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const searchParams = new URLSearchParams(location.search);
  const groupIdParam = searchParams.get('groupId');

  // State
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [selectedReceiverId, setSelectedReceiverId] = useState<number | null>(null);
  const [selectedPayerId, setSelectedPayerId] = useState<number | null>(null); // Add payerId state
  const [date, setDate] = useState<Date | null>(new Date()); // Initialize with today's date
  const [balances, setBalances] = useState<Balance[]>([]);
  const [suggestions, setSuggestions] = useState<PaymentSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingBalances, setLoadingBalances] = useState(false);
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
      setLoadingBalances(true);
      setSelectedReceiverId(null); // Reset receiver when changing groups
      
      // Fetch group details with members
      const groupResponse = await api.get(`/groups/${groupId}`);
      console.log('Group API response:', groupResponse.data);
      const group = groupResponse.data.data.group;
      
      // Check if group has members
      const membersArray = group.memberships || group.members;
      if (!membersArray || membersArray.length === 0) {
        console.warn('Group has no members or members is not loaded correctly:', group);
      } else {
        console.log('Group members loaded:', membersArray);
        console.log('Group structure:', Object.keys(group));
      }
      
      setSelectedGroup(group);
      
      // Set the current user as the default payer
      if (user?.id) {
        setSelectedPayerId(user.id);
      }
      
      // Fetch balances for the group
      const balancesResponse = await api.get(`/stats/group/${groupId}/balances`);
      setBalances(balancesResponse.data.data.balances);
      
      // Fetch payment suggestions
      try {
        const suggestionsResponse = await api.get(`/stats/group/${groupId}/payment-suggestions`);
        console.log('Payment suggestions response:', suggestionsResponse.data);
        setSuggestions(suggestionsResponse.data.data.paymentSuggestions || []);
      } catch (error) {
        console.error('Error fetching payment suggestions:', error);
        setSuggestions([]);
      }
      
      setLoadingBalances(false);
    } catch (error) {
      console.error('Error fetching group details and balances', error);
      setLoadingBalances(false);
    }
  };
  
  // Handle group change
  const handleGroupChange = (event: SelectChangeEvent<number>) => {
    handleGroupSelect(event.target.value as number);
  };
  

  // Apply suggestion
  const applySuggestion = (suggestion: PaymentSuggestion) => {
    if (!suggestion || !selectedGroup) {
      console.error('No suggestion or selected group when trying to apply suggestion');
      return;
    }
    
    // Check both members and memberships since there seems to be a field name mismatch
    const membersArray = selectedGroup.memberships || selectedGroup.members;
    
    if (!membersArray || membersArray.length === 0) {
      console.error('No members in group when trying to apply suggestion');
      return;
    }
    
    // Find the group member that matches the suggestion payer (from)
    const payerMember = membersArray.find(
      member => member.userId === suggestion.from.id
    );
    
    // Find the group member that matches the suggestion recipient (to)
    const receiverMember = membersArray.find(
      member => member.userId === suggestion.to.id
    );
    
    if (payerMember && receiverMember) {
      setSelectedPayerId(payerMember.userId);
      setSelectedReceiverId(receiverMember.userId);
      setAmount(suggestion.amount);
    } else {
      console.error('Could not find matching members for suggestion:', suggestion);
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!selectedGroup) {
      newErrors.group = 'Please select a group';
    }
    
    if (!selectedPayerId) {
      newErrors.payer = 'Please select a person who is paying';
    }
    
    if (!selectedReceiverId) {
      newErrors.receiver = 'Please select a person to pay';
    }
    
    if (selectedPayerId && selectedReceiverId && selectedPayerId === selectedReceiverId) {
      newErrors.same = 'Payer and receiver cannot be the same person';
    }
    
    if (!amount || amount <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    
    if (!date) {
      newErrors.date = 'Please select a payment date';
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
      
      await api.post('/payments', {
        groupId: selectedGroup?.id,
        payerId: selectedPayerId,
        receiverId: selectedReceiverId,
        amount,
        description,
        date: date ? date.toISOString() : new Date().toISOString() // Use selected date or fallback to current date
      });
      
      // Navigate to group detail page
      navigate(`/groups/${selectedGroup?.id}`);
    } catch (error: any) {
      console.error('Error creating payment', error);
      setSubmitError(error.response?.data?.message || 'Failed to record payment');
      setLoading(false);
    }
  };
  
  // Get all members of the group
  const getGroupMembers = () => {
    if (!selectedGroup) {
      console.log('No selected group');
      return [];
    }
    
    // Check both members and memberships since there seems to be a field name mismatch
    const membersArray = selectedGroup.memberships || selectedGroup.members;
    
    if (!membersArray || !Array.isArray(membersArray) || membersArray.length === 0) {
      console.log('No members in the group or members is not an array', selectedGroup);
      return [];
    }
    
    console.log('Group members array:', membersArray);
    return membersArray;
  };
  
  // Get list of people user can pay
  const getPossibleReceivers = () => {
    const members = getGroupMembers();
    
    // Filter out selected payer (we can't pay to the same person)
    const receivers = selectedPayerId 
      ? members.filter(member => member.userId !== selectedPayerId)
      : members;
      
    console.log('Filtered receivers:', receivers);
    return receivers;
  };
  
  // Get list of possible payers
  const getPossiblePayers = () => {
    return getGroupMembers();
  };
  
  // Get all suggestions for the group - no longer filtering by current user
  const getGroupSuggestions = () => {
    if (!suggestions || !Array.isArray(suggestions)) {
      return [];
    }
    return suggestions;
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
      <Typography variant="h4" sx={{ mb: 3 }}>Record a Payment</Typography>
      
      {submitError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError}
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
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
              
              {selectedGroup && (
                <>
                  <Grid item xs={12}>
                    <FormControl fullWidth error={!!errors.payer}>
                      <InputLabel id="payer-label">Paid By</InputLabel>
                      <Select
                        labelId="payer-label"
                        id="payer"
                        value={selectedPayerId || ''}
                        label="Paid By"
                        onChange={(e) => {
                          const newPayerId = e.target.value as number;
                          setSelectedPayerId(newPayerId);
                          
                          // If the current receiver is the same as the new payer, reset the receiver
                          if (newPayerId === selectedReceiverId) {
                            setSelectedReceiverId(null);
                          }
                        }}
                        disabled={loadingBalances}
                      >
                        {getPossiblePayers().map((member) => (
                          <MenuItem key={member.userId} value={member.userId}>
                            {member.user.firstName} {member.user.lastName}
                            {member.userId === user?.id ? ' (You)' : ''}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.payer && <FormHelperText>{errors.payer}</FormHelperText>}
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl fullWidth error={!!errors.receiver}>
                      <InputLabel id="receiver-label">Pay To</InputLabel>
                      <Select
                        labelId="receiver-label"
                        id="receiver"
                        value={selectedReceiverId || ''}
                        label="Pay To"
                        onChange={(e) => setSelectedReceiverId(e.target.value as number)}
                        disabled={loadingBalances}
                      >
                        {getPossibleReceivers().map((member) => (
                          <MenuItem key={member.userId} value={member.userId}>
                            {member.user.firstName} {member.user.lastName}
                            {member.userId === user?.id ? ' (You)' : ''}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.receiver && <FormHelperText>{errors.receiver}</FormHelperText>}
                    </FormControl>
                  </Grid>
                  
                  {errors.same && (
                    <Grid item xs={12}>
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {errors.same}
                      </Alert>
                    </Grid>
                  )}
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">{selectedGroup.currency}</InputAdornment>
                        )
                      }}
                      error={!!errors.amount}
                      helperText={errors.amount}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Description (Optional)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <DatePicker
                      label="Payment Date"
                      value={date}
                      onChange={(newDate) => setDate(newDate)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.date,
                          helperText: errors.date
                        }
                      }}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        </Card>
        
        {selectedGroup && balances.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Payment Suggestions</Typography>
              
              {loadingBalances ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : getGroupSuggestions().length > 0 ? (
                <Grid container spacing={2}>
                  {getGroupSuggestions().map((suggestion, index) => (
                    <Grid item xs={12} key={index}>
                      <Alert 
                        severity="info"
                        sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Box>
                          <Typography variant="body2">
                            Suggestion: {suggestion.from.name}{suggestion.from.id === user?.id ? ' (You)' : ''} pays {selectedGroup.currency} {suggestion.amount.toFixed(2)} to {suggestion.to.name}{suggestion.to.id === user?.id ? ' (You)' : ''}
                          </Typography>
                        </Box>
                        <Button 
                          size="small" 
                          variant="outlined"
                          onClick={() => applySuggestion(suggestion)}
                        >
                          Apply
                        </Button>
                      </Alert>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No payment suggestions available for this group at this time.
                </Typography>
              )}
              
              {selectedPayerId && selectedReceiverId && amount && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="success">
                    <Typography variant="body2">
                      {selectedPayerId === user?.id ? "You're" : (
                        <>
                          {getGroupMembers().find(m => m.userId === selectedPayerId)?.user?.firstName || ''} {
                          getGroupMembers().find(m => m.userId === selectedPayerId)?.user?.lastName || ''} is
                        </>
                      )} about to pay {selectedGroup.currency} {(amount as number).toFixed(2)} to {
                        getPossibleReceivers().find(m => m.userId === selectedReceiverId)?.user?.firstName || ''
                      } {
                        getPossibleReceivers().find(m => m.userId === selectedReceiverId)?.user?.lastName || ''
                      }
                    </Typography>
                  </Alert>
                </Box>
              )}
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
            {loading ? <CircularProgress size={24} /> : 'Record Payment'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default CreatePaymentPage;
