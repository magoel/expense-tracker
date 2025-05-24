import { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  CircularProgress,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Fab,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { api } from '../../api';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { useAuthStore } from '../../stores/authStore';

interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string;
  receiptUrl: string | null;
  paidBy: {
    id: number;
    firstName: string;
    lastName: string;
  };
  group: {
    id: number;
    name: string;
    currency: string;
  };
}

interface Group {
  id: number;
  name: string;
}

const ExpensesPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | 'all'>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch groups on mount
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await api.get('/groups');
        setGroups(response.data.data.groups);
      } catch (error) {
        console.error('Error fetching groups', error);
        setError('Failed to load groups');
      }
    };

    fetchGroups();
  }, []);

  // Fetch expenses
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setLoading(true);

        let url = '/expenses/recent';
        if (selectedGroup !== 'all') {
          url = `/expenses/group/${selectedGroup}`;
        }

        const response = await api.get(url, {
          params: {
            page: page + 1,
            limit: rowsPerPage
          }
        });

        setExpenses(response.data.data.expenses);
        setTotalCount(response.data.data.pagination.totalCount);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching expenses', error);
        setError('Failed to load expenses');
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [selectedGroup, page, rowsPerPage]);

  // Handle group filter change
  const handleGroupChange = (event: SelectChangeEvent<number | 'all'>) => {
    setSelectedGroup(event.target.value as number | 'all');
    setPage(0);
  };

  // Handle page change
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Expenses</Typography>
        <Button
          component={RouterLink}
          to="/expenses/new"
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ display: { xs: 'none', sm: 'flex' } }}
        >
          Add Expense
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="group-filter-label">Group</InputLabel>
              <Select
                labelId="group-filter-label"
                value={selectedGroup}
                label="Group"
                onChange={handleGroupChange}
              >
                <MenuItem value="all">All Groups</MenuItem>
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : expenses.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ReceiptIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No expenses found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedGroup === 'all'
                  ? "You haven't created any expenses yet."
                  : "No expenses found in this group."}
              </Typography>
              <Button
                component={RouterLink}
                to="/expenses/new"
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ mt: 2 }}
              >
                Add Your First Expense
              </Button>
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Description</TableCell>
                    <TableCell>Group</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Paid By</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Receipt</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow 
                      key={expense.id} 
                      hover
                      onClick={() => navigate(`/expenses/${expense.id}`)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                        },
                      }}
                    >
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>
                        {expense.group ? (
                          <Chip
                            label={expense.group.name}
                            size="small"
                            component={RouterLink}
                            to={`/groups/${expense.group.id}`}
                            clickable
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">No group</Typography>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(expense.amount, expense.group?.currency || 'USD')}</TableCell>
                      <TableCell>
                        {expense.paidBy.id === user?.id
                          ? 'You'
                          : `${expense.paidBy.firstName} ${expense.paidBy.lastName}`}
                      </TableCell>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell>
                        {expense.receiptUrl && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (expense.receiptUrl) {
                                window.open(expense.receiptUrl || '', '_blank');
                              }
                            }}
                          >
                            <ReceiptIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          size="small"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={totalCount}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
              />
            </TableContainer>
          )}
        </CardContent>
      </Card>

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
          to="/expenses/new"
          aria-label="Add Expense"
        >
          <AddIcon />
        </Fab>
      </Box>
    </Box>
  );
};

export default ExpensesPage;
