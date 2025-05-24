import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Fab,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  TextField,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  People as PeopleIcon,
} from '@mui/icons-material';

import { api } from '../../api';

interface Group {
  id: number;
  name: string;
  description: string;
  code: string;
  currency: string;
  createdAt: string;
  memberCount: number;
}

const GroupsPage = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [groupCode, setGroupCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const response = await api.get('/groups');
        setGroups(response.data.data.groups);
        setError(null);
      } catch (err) {
        setError('Failed to fetch groups');
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  const handleJoinDialogOpen = () => {
    setJoinDialogOpen(true);
    setJoinError(null);
    setJoinSuccess(null);
    setGroupCode('');
  };

  const handleJoinDialogClose = () => {
    setJoinDialogOpen(false);
  };

  const handleJoinGroup = async () => {
    if (!groupCode.trim()) {
      setJoinError('Please enter a group code');
      return;
    }

    try {
      setJoining(true);
      setJoinError(null);
      
      const response = await api.post('/groups/join', { code: groupCode.trim() });
      const { data } = response.data;
      
      // Check the status field to determine what message to show
      if (data.status === 'already_member') {
        setJoinSuccess(`You are already a member of group: ${data.group.name}`);
      } else if (data.status === 'pending') {
        setJoinError(`Your request to join group ${data.group.name} is pending approval`);
      } else {
        setJoinSuccess(`Join request sent for group: ${data.group.name}`);
      }
      
      setGroupCode('');
      
    } catch (err: any) {
      setJoinError(err.response?.data?.message || 'Failed to join group');
    } finally {
      setJoining(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Groups</Typography>
        <Box>
          <Button 
            variant="outlined" 
            onClick={handleJoinDialogOpen} 
            sx={{ mr: 2 }}
          >
            Join Group
          </Button>
          <Button
            variant="contained"
            component={RouterLink}
            to="/groups/new"
            startIcon={<AddIcon />}
          >
            Create Group
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : groups.length === 0 ? (
        <EmptyGroupsState onJoinClick={handleJoinDialogOpen} />
      ) : (
        <Grid container spacing={3}>
          {groups.map((group) => (
            <Grid item xs={12} md={6} lg={4} key={group.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      <PeopleIcon />
                    </Avatar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                      {group.name}
                    </Typography>
                    <Chip 
                      label={group.currency}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  </Box>
                  {group.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {group.description}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {group.memberCount || 0} members
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    component={RouterLink} 
                    to={`/groups/${group.id}`}
                  >
                    View Details
                  </Button>
                  <Button 
                    size="small" 
                    component={RouterLink} 
                    to={`/expenses/new?groupId=${group.id}`}
                  >
                    Add Expense
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Join Group Dialog */}
      <Dialog open={joinDialogOpen} onClose={handleJoinDialogClose}>
        <DialogTitle>Join a Group</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter the group code to join an existing group. Your request will need to be approved by a group member.
          </DialogContentText>
          
          {joinError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {joinError}
            </Alert>
          )}
          
          {joinSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {joinSuccess}
            </Alert>
          )}
          
          <TextField
            autoFocus
            label="Group Code"
            fullWidth
            variant="outlined"
            value={groupCode}
            onChange={(e) => setGroupCode(e.target.value)}
            disabled={joining}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleJoinDialogClose}>Cancel</Button>
          <Button 
            onClick={handleJoinGroup} 
            variant="contained" 
            disabled={joining || !!joinSuccess}
          >
            {joining ? <CircularProgress size={24} /> : 'Join'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* FAB for mobile */}
      <Box
        sx={{
          display: { xs: 'block', sm: 'none' },
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
      >
        <Fab
          color="primary"
          component={RouterLink}
          to="/groups/new"
          aria-label="Create Group"
        >
          <AddIcon />
        </Fab>
      </Box>
    </Box>
  );
};

// Component to show when user has no groups
const EmptyGroupsState = ({ onJoinClick }: { onJoinClick: () => void }) => {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <PeopleIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        No Groups Yet
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Create a new group to start tracking expenses together,
        or join an existing group with a group code.
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
          onClick={onJoinClick}
        >
          Join Group
        </Button>
      </Box>
    </Box>
  );
};

export default GroupsPage;
