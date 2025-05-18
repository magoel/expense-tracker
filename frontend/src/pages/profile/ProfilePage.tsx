import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Button,
  Grid,
  TextField,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../api';

const ProfilePage = () => {
  const { user, updateUserData, logout } = useAuthStore();

  // User form state
  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsSuccess, setNotificationsSuccess] = useState(false);
  
  // Delete account dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Set initial user data
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setAvatarUrl(user.avatarUrl || '');
      
      // Fetch notification settings
      fetchNotificationSettings();
    }
  }, [user]);
  
  // Fetch notification settings (mocked)
  const fetchNotificationSettings = async () => {
    try {
      setNotificationsLoading(true);
      
      // In a real implementation, this would be an actual API call
      // await api.get('/notifications/settings');
      
      // Using mock data for now
      setTimeout(() => {
        setEmailNotifications(true);
        setPushNotifications(true);
        setNotificationsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching notification settings', error);
      setNotificationsLoading(false);
    }
  };

  // Toggle edit mode
  const handleToggleEditMode = () => {
    if (editMode) {
      // Reset form
      setFirstName(user?.firstName || '');
      setLastName(user?.lastName || '');
      setEmail(user?.email || '');
      setUpdateSuccess(false);
      setUpdateError(null);
    }
    setEditMode(!editMode);
  };

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setUpdateSuccess(false);
      setUpdateError(null);
      
      const response = await api.put('/user/profile', {
        firstName,
        lastName,
        email
      });
      
      // Update local user data
      updateUserData(response.data.data.user);
      
      setUpdateSuccess(true);
      setEditMode(false);
      setLoading(false);
    } catch (error: any) {
      console.error('Error updating profile', error);
      setUpdateError(error.response?.data?.message || 'Failed to update profile');
      setLoading(false);
    }
  };
  
  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      setUploading(true);
      
      const response = await api.post('/user/avatar', formData);
      
      // Update avatar url
      setAvatarUrl(response.data.data.avatarUrl);
      
      // Update user data in state
      if (user) {
        updateUserData({ ...user, avatarUrl: response.data.data.avatarUrl });
      }
      
      setUploading(false);
    } catch (error) {
      console.error('Error uploading avatar', error);
      setUploading(false);
    }
  };
  
  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    try {
      setPasswordLoading(true);
      setPasswordSuccess(false);
      setPasswordError(null);
      
      await api.put('/user/password', {
        currentPassword,
        newPassword
      });
      
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordLoading(false);
    } catch (error: any) {
      console.error('Error changing password', error);
      setPasswordError(error.response?.data?.message || 'Failed to change password');
      setPasswordLoading(false);
    }
  };
  
  // Handle notification settings change
  const handleNotificationSettingsChange = async () => {
    try {
      setNotificationsLoading(true);
      setNotificationsSuccess(false);
      
      // In a real implementation, this would be an actual API call
      // await api.put('/notifications/settings', {
      //   emailNotifications,
      //   pushNotifications
      // });
      
      // Using setTimeout to simulate API call
      setTimeout(() => {
        setNotificationsSuccess(true);
        setNotificationsLoading(false);
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          setNotificationsSuccess(false);
        }, 3000);
      }, 500);
    } catch (error) {
      console.error('Error updating notification settings', error);
      setNotificationsLoading(false);
    }
  };
  
  // Handle account deletion
  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      
      await api.post('/user/delete', {
        password: deletePassword
      });
      
      // Log out user after account deletion
      logout();
    } catch (error: any) {
      console.error('Error deleting account', error);
      setDeleteError(error.response?.data?.message || 'Failed to delete account');
      setDeleteLoading(false);
    }
  };
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return '';
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Profile Settings</Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          {/* Profile Summary Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                {avatarUrl ? (
                  <Avatar 
                    src={avatarUrl} 
                    sx={{ 
                      width: 100, 
                      height: 100, 
                      mx: 'auto',
                      mb: 2
                    }} 
                  />
                ) : (
                  <Avatar 
                    sx={{ 
                      width: 100, 
                      height: 100, 
                      mx: 'auto',
                      mb: 2,
                      bgcolor: 'primary.main',
                      fontSize: 36
                    }} 
                  >
                    {getUserInitials()}
                  </Avatar>
                )}
                <Box sx={{ position: 'absolute', bottom: 10, right: -10 }}>
                  <Button
                    component="label"
                    disabled={uploading}
                    sx={{ 
                      minWidth: 'auto', 
                      width: 36, 
                      height: 36, 
                      borderRadius: '50%' 
                    }}
                    variant="contained"
                  >
                    {uploading ? <CircularProgress size={20} /> : <EditIcon fontSize="small" />}
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleAvatarUpload}
                    />
                  </Button>
                </Box>
              </Box>
              
              <Typography variant="h5" gutterBottom>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
              
              {/* User stats */}
              <Box sx={{ mt: 2 }}>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">Member since</Typography>
                    <Typography variant="body1">
                      {new Date(user?.createdAt || '').toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">Groups</Typography>
                    <Typography variant="body1">
                      {user?.groupCount || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">Expenses</Typography>
                    <Typography variant="body1">
                      {user?.expenseCount || 0}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
          
          {/* Account Actions */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Actions
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary="Delete Account" secondary="Permanently delete your account and all your data" />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" color="error" onClick={() => setDeleteDialogOpen(true)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText primary="Export Data" secondary="Download all your data in JSON format" />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" color="primary">
                      <SaveIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={8}>
          {/* Profile Information */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Profile Information</Typography>
                <Button 
                  startIcon={editMode ? <CancelIcon /> : <EditIcon />} 
                  onClick={handleToggleEditMode}
                  color={editMode ? 'error' : 'primary'}
                >
                  {editMode ? 'Cancel' : 'Edit Profile'}
                </Button>
              </Box>
              
              {updateSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Profile updated successfully!
                </Alert>
              )}
              
              {updateError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {updateError}
                </Alert>
              )}
              
              <form onSubmit={handleProfileUpdate}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={!editMode || loading}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={!editMode || loading}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!editMode || loading || user?.authProvider !== 'local'}
                      helperText={user?.authProvider !== 'local' ? 'Email cannot be changed for accounts linked with Google' : ''}
                    />
                  </Grid>
                  
                  {editMode && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button 
                          type="submit" 
                          variant="contained" 
                          disabled={loading}
                          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                        >
                          Save Changes
                        </Button>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </form>
            </CardContent>
          </Card>
          
          {/* Change Password */}
          {user?.authProvider === 'local' && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Change Password
                </Typography>
                
                {passwordSuccess && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Password changed successfully!
                  </Alert>
                )}
                
                {passwordError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {passwordError}
                  </Alert>
                )}
                
                <form onSubmit={handlePasswordChange}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Current Password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={passwordLoading}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={passwordLoading}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Confirm New Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={passwordLoading}
                        error={newPassword !== confirmPassword && confirmPassword.length > 0}
                        helperText={newPassword !== confirmPassword && confirmPassword.length > 0 ? 'Passwords do not match' : ''}
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button 
                          type="submit" 
                          variant="contained" 
                          disabled={passwordLoading}
                        >
                          {passwordLoading ? <CircularProgress size={24} /> : 'Change Password'}
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </form>
              </CardContent>
            </Card>
          )}
          
          {/* Notification Settings */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  <NotificationsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Notification Settings
                </Typography>
                
                <Button 
                  variant="contained" 
                  disabled={notificationsLoading}
                  onClick={handleNotificationSettingsChange}
                >
                  {notificationsLoading ? <CircularProgress size={24} /> : 'Save Settings'}
                </Button>
              </Box>
              
              {notificationsSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Notification settings updated successfully!
                </Alert>
              )}
              
              <Box sx={{ mt: 2 }}>
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={emailNotifications} 
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Email Notifications"
                  />
                  <Typography variant="body2" color="text.secondary">
                    Receive email notifications about new expenses, payments, and activity in your groups
                  </Typography>
                </Paper>
                
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={pushNotifications} 
                        onChange={(e) => setPushNotifications(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Push Notifications"
                  />
                  <Typography variant="body2" color="text.secondary">
                    Receive push notifications on your devices about new expenses and payments
                  </Typography>
                </Paper>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Your Account?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete your account and all your data. This action cannot be undone.
          </DialogContentText>
          
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2, mb: 1 }}>
              {deleteError}
            </Alert>
          )}
          
          <TextField
            autoFocus
            margin="dense"
            label="Enter your password to confirm"
            type="password"
            fullWidth
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            disabled={deleteLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteAccount} 
            color="error" 
            disabled={!deletePassword || deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={24} /> : 'Delete Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;
