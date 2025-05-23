import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  TextField, 
  Button, 
  Paper,
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowBack, Save } from '@mui/icons-material';
import { api } from '../../api';

interface GroupFormData {
  name: string;
  description: string;
}

const CreateGroupPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Group name is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/groups', formData);
      
      if (response.data && response.data.data && response.data.data.group) {
        navigate(`/groups/${response.data.data.group.id}`);
      } else {
        navigate('/groups');
      }
    } catch (err: any) {
      console.error('Failed to create group:', err);
      setError(err.response?.data?.message || 'Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/groups')}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h5">Create New Group</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}

      <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              label="Group Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              variant="outlined"
              autoFocus
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              variant="outlined"
              multiline
              rows={4}
              placeholder="Describe the purpose of this group..."
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
              >
                Create Group
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default CreateGroupPage;
