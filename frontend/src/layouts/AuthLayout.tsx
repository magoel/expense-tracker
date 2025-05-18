import { Outlet } from 'react-router-dom';
import { Box, Container, Paper } from '@mui/material';

const AuthLayout = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        py: 4,
      }}
    >
      <Container maxWidth="xs">
        <Paper
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
          }}
        >
          <Outlet />
        </Paper>
      </Container>
    </Box>
  );
};

export default AuthLayout;
