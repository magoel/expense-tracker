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
  Alert
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { PeopleAlt, Payments, Add, ArrowBack } from '@mui/icons-material';
import { api } from '../../api';

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

const GroupDetailPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/groups/${groupId}`);
        setGroup(response.data.data.group);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch group details:', err);
        setError('Failed to load group details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (groupId) {
      fetchGroup();
    }
  }, [groupId]);

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
              
              <List>
                {group.memberships && group.memberships.length > 0 ? (
                  group.memberships.map((membership) => (
                    <ListItem key={membership.id}>
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
              
              <Divider sx={{ my: 1 }} />
              
              <Box sx={{ py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  No recent activity to display
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default GroupDetailPage;
