import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tab,
  Tabs,
  CircularProgress,
  Button,
  Alert
} from '@mui/material';
import {
  Download as DownloadIcon,
} from '@mui/icons-material';
import { api } from '../../api';
import { formatCurrency } from '../../utils/formatters';

// Chart imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface Group {
  id: number;
  name: string;
  currency: string;
}

interface TimeSeriesData {
  period: string;
  total: number;
}

interface PayerData {
  userId: number;
  total: number;
  paidBy: {
    firstName: string;
    lastName: string;
  };
}

interface Balance {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  balance: number;
}

const StatisticsPage = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [timeFrame, setTimeFrame] = useState<string>('monthly');
  const [activeTab, setActiveTab] = useState<number>(0);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [byPayerData, setByPayerData] = useState<PayerData[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState({
    groups: true,
    stats: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch groups on mount
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await api.get('/groups');
        setGroups(response.data.data.groups);
        
        if (response.data.data.groups.length > 0) {
          setSelectedGroup(response.data.data.groups[0].id);
        }
        
        setLoading(prev => ({ ...prev, groups: false }));
      } catch (error) {
        console.error('Error fetching groups', error);
        setError('Failed to load groups');
        setLoading(prev => ({ ...prev, groups: false }));
      }
    };
    
    fetchGroups();
  }, []);
  
  // Fetch statistics when group or time frame changes
  useEffect(() => {
    const fetchStatistics = async () => {
      if (!selectedGroup) return;
      
      try {
        setLoading(prev => ({ ...prev, stats: true }));
        setError(null);
        
        // Fetch expense summary
        const expenseSummaryResponse = await api.get(
          `/stats/group/${selectedGroup}/expenses`, 
          { params: { timeFrame } }
        );
        setTimeSeriesData(expenseSummaryResponse.data.data.timeSeriesData);
        setByPayerData(expenseSummaryResponse.data.data.byPayer);
        
        // Fetch balances
        const balancesResponse = await api.get(`/stats/group/${selectedGroup}/balances`);
        setBalances(balancesResponse.data.data.balances);
        
        setLoading(prev => ({ ...prev, stats: false }));
      } catch (error) {
        console.error('Error fetching statistics', error);
        setError('Failed to load statistics');
        setLoading(prev => ({ ...prev, stats: false }));
      }
    };
    
    if (selectedGroup) {
      fetchStatistics();
    }
  }, [selectedGroup, timeFrame]);
  
  // Handle group change
  const handleGroupChange = (event: SelectChangeEvent<number>) => {
    setSelectedGroup(event.target.value as number);
  };
  
  // Handle time frame change
  const handleTimeFrameChange = (event: SelectChangeEvent<string>) => {
    setTimeFrame(event.target.value);
  };
  
  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Get selected group currency
  const getSelectedGroupCurrency = () => {
    if (!selectedGroup) return 'USD';
    const group = groups.find(g => g.id === selectedGroup);
    return group ? group.currency : 'USD';
  };
  
  // Prepare expense time series chart data
  const getTimeSeriesChartData = () => {
    const labels = timeSeriesData.map(item => item.period);
    const data = timeSeriesData.map(item => item.total);
    
    return {
      labels,
      datasets: [
        {
          label: 'Total Expenses',
          data,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  };
  
  // Prepare expense by payer chart data
  const getByPayerChartData = () => {
    const labels = byPayerData.map(item => `${item.paidBy.firstName} ${item.paidBy.lastName}`);
    const data = byPayerData.map(item => item.total);
    
    const backgroundColors = [
      'rgba(255, 99, 132, 0.6)',
      'rgba(54, 162, 235, 0.6)',
      'rgba(255, 206, 86, 0.6)',
      'rgba(75, 192, 192, 0.6)',
      'rgba(153, 102, 255, 0.6)',
      'rgba(255, 159, 64, 0.6)',
      'rgba(255, 99, 132, 0.6)',
    ];
    
    return {
      labels,
      datasets: [
        {
          label: 'Amount Paid',
          data,
          backgroundColor: backgroundColors.slice(0, data.length),
        },
      ],
    };
  };
  
  // Prepare balances chart data
  const getBalancesChartData = () => {
    const labels = balances.map(item => `${item.firstName} ${item.lastName}`);
    const data = balances.map(item => item.balance);
    
    const backgroundColors = data.map(balance => 
      balance >= 0 
        ? 'rgba(75, 192, 192, 0.6)' // Positive - green
        : 'rgba(255, 99, 132, 0.6)' // Negative - red
    );
    
    return {
      labels,
      datasets: [
        {
          label: 'Balance',
          data,
          backgroundColor: backgroundColors,
        },
      ],
    };
  };
  
  // Export data to CSV
  const exportToCSV = () => {
    if (!selectedGroup || !timeSeriesData.length) return;
    
    // Prepare CSV content based on active tab
    let csvContent = '';
    let filename = '';
    
    if (activeTab === 0) { // Expenses Over Time
      csvContent = 'Period,Total\n';
      timeSeriesData.forEach(item => {
        csvContent += `${item.period},${item.total}\n`;
      });
      filename = `expenses_over_time_${timeFrame}.csv`;
    } else if (activeTab === 1) { // Expenses By Payer
      csvContent = 'Payer,Total\n';
      byPayerData.forEach(item => {
        csvContent += `${item.paidBy.firstName} ${item.paidBy.lastName},${item.total}\n`;
      });
      filename = 'expenses_by_payer.csv';
    } else if (activeTab === 2) { // Balances
      csvContent = 'Person,Balance\n';
      balances.forEach(item => {
        csvContent += `${item.firstName} ${item.lastName},${item.balance}\n`;
      });
      filename = 'balances.csv';
    }
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (loading.groups) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (groups.length === 0) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3 }}>Statistics</Typography>
        <Alert severity="info">
          You don't have any groups yet. Create or join a group to see statistics.
        </Alert>
        <Button
          component={RouterLink}
          to="/groups/new"
          variant="contained"
          sx={{ mt: 2 }}
        >
          Create Group
        </Button>
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Statistics</Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={exportToCSV}
          disabled={loading.stats || !timeSeriesData.length}
        >
          Export to CSV
        </Button>
      </Box>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} key="group-selector">
              <FormControl fullWidth>
                <InputLabel id="group-label">Group</InputLabel>
                <Select
                  labelId="group-label"
                  id="group"
                  value={selectedGroup || ''}
                  label="Group"
                  onChange={handleGroupChange}
                >
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} key="time-frame-selector">
              <FormControl fullWidth>
                <InputLabel id="time-frame-label">Time Frame</InputLabel>
                <Select
                  labelId="time-frame-label"
                  id="time-frame"
                  value={timeFrame}
                  label="Time Frame"
                  onChange={handleTimeFrameChange}
                >
                  <MenuItem value="daily" key="daily">Daily</MenuItem>
                  <MenuItem value="weekly" key="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly" key="monthly">Monthly</MenuItem>
                  <MenuItem value="yearly" key="yearly">Yearly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="Expenses Over Time" key="expenses-over-time" />
          <Tab label="Expenses By Payer" key="expenses-by-payer" />
          <Tab label="Balances" key="balances" />
        </Tabs>
      </Box>
      
      {loading.stats ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Expenses Over Time Tab */}
          {activeTab === 0 && timeSeriesData.length > 0 && (
            <Card>
              <CardHeader title="Expenses Over Time" />
              <Divider />
              <CardContent>
                <Box sx={{ height: 400 }}>
                  <Line 
                    data={getTimeSeriesChartData()} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          title: {
                            display: true,
                            text: `Amount (${getSelectedGroupCurrency()})`,
                          },
                        },
                        x: {
                          title: {
                            display: true,
                            text: timeFrame === 'daily' 
                              ? 'Day' 
                              : timeFrame === 'weekly' 
                                ? 'Week' 
                                : timeFrame === 'monthly' 
                                  ? 'Month' 
                                  : 'Year',
                          },
                        },
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          )}
          
          {/* Expenses By Payer Tab */}
          {activeTab === 1 && byPayerData.length > 0 && (
            <Card>
              <CardHeader title="Expenses By Payer" />
              <Divider />
              <CardContent>
                <Box sx={{ height: 400 }}>
                  <Grid container>
                    <Grid item xs={12} md={8} key="bar-chart">
                      <Bar 
                        data={getByPayerChartData()} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              title: {
                                display: true,
                                text: `Amount (${getSelectedGroupCurrency()})`,
                              },
                            },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4} key="pie-chart">
                      <Pie 
                        data={getByPayerChartData()} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                        }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          )}
          
          {/* Balances Tab */}
          {activeTab === 2 && balances.length > 0 && (
            <Card>
              <CardHeader title="Group Member Balances" />
              <Divider />
              <CardContent>
                <Box sx={{ height: 400 }}>
                  <Bar 
                    data={getBalancesChartData()} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          title: {
                            display: true,
                            text: `Balance (${getSelectedGroupCurrency()})`,
                          },
                          beginAtZero: true,
                        },
                      },
                    }}
                  />
                </Box>
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Balance Summary
                  </Typography>
                  <Grid container spacing={2}>
                    {balances.map((balance) => (
                      <Grid item xs={12} sm={6} md={4} key={balance.userId}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle2">
                              {balance.firstName} {balance.lastName}
                            </Typography>
                            <Typography
                              variant="h6"
                              color={balance.balance > 0 ? 'success.main' : balance.balance < 0 ? 'error.main' : 'text.secondary'}
                            >
                              {formatCurrency(balance.balance, getSelectedGroupCurrency())}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {balance.balance > 0 
                                ? 'is owed money' 
                                : balance.balance < 0 
                                  ? 'owes money' 
                                  : 'is settled up'}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
};

export default StatisticsPage;
