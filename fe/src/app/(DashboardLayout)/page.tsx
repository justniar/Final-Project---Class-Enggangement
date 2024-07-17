'use client'
import { Grid, Box } from '@mui/material';
import PageContainer from '@/components/container/PageContainer';
// components
import SalesOverview from '@/components/dashboard/SalesOverview';
import YearlyBreakup from '@/components/dashboard/YearlyBreakup';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import ProductPerformance from '@/components/dashboard/ProductPerformance';
import Blog from '@/components/dashboard/Blog';
import MonthlyEarnings from '@/components/dashboard/MonthlyEarnings';
import SesiKuliah from '@/components/dashboard/RecentTransactions';
import PerformaPendidik from '@/components/dashboard/ProductPerformance';
import TingkatFokus from '@/components/dashboard/YearlyBreakup';
import Keefektifan from '@/components/dashboard/MonthlyEarnings';

const Dashboard = () => {
  return (
    <PageContainer title="Dashboard" description="this is Dashboard">
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <SalesOverview />
          </Grid>
          <Grid item xs={12} lg={4}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TingkatFokus />
              </Grid>
              <Grid item xs={12}>
                <Keefektifan />
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} lg={4}>
            <SesiKuliah />
          </Grid>
          <Grid item xs={12} lg={8}>
            <PerformaPendidik/>
          </Grid>
          <Grid item xs={12}>
            <Blog />
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  )
}

export default Dashboard;
