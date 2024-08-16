import React, { useEffect, useState } from 'react';
import { Select, MenuItem, Box, Typography, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DashboardCard from '@/components/shared/DashboardCard';
import dynamic from "next/dynamic";
import axios from 'axios';
import PageContainer from '@/components/container/PageContainer';
import TingkatFokus from '@/components/dashboard/TingkatFokus';
import Keefektifan from '@/components/dashboard/Keefektifan';
import SesiKuliah from '@/components/dashboard/SesiKuliah';
import PerformaPendidik from '@/components/dashboard/PerformaPendidik';
import Blog from '@/components/dashboard/Blog';

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const DashboardAdmin = () => {
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const getUserData = async () => {
      const user = await fetchUser();
      setUserName(user.name);
      console.log(setUserName)
    };

    getUserData();
  }, []);

  return (
    <PageContainer title="Dashboard" description="this is Dashboard">
      <Box>
        {userName && (
            <Typography variant="h5" mb={3}>
              Selamat datang, {userName}!
            </Typography>
          )}
        
        <Grid container spacing={3}>
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

export default DashboardAdmin;
