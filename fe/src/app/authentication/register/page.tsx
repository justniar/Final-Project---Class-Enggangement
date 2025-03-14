"use client"
import React from 'react';
import { Grid, Box, Card, Typography, Stack } from '@mui/material';
import Link from 'next/link';
import PageContainer from '@/components/container/PageContainer';
import AuthRegister from '../authregister/AuthRegister';
import Image from 'next/image';

const Register2 = () => (
    <PageContainer title="Register" description="this is Register page">
        <Box
            sx={{
                position: "relative",
                "&:before": {
                    content: '""',
                    background: "radial-gradient(#d2f1df, #d3d7fa, #bad8f4)",
                    backgroundSize: "400% 400%",
                    animation: "gradient 15s ease infinite",
                    position: "absolute",
                    height: "100%",
                    width: "100%",
                    opacity: "0.3",
                },
            }}
        >
            <Grid container spacing={0} justifyContent="center" sx={{ height: "100vh" }}>
                <Grid item xs={12} sm={12} lg={4} xl={3} display="flex" justifyContent="center" alignItems="center">
                    <Card elevation={9} sx={{ p: 4, zIndex: 1, width: "100%", maxWidth: "500px" }}>
                    <Box display="flex" alignItems="center" justifyContent="center">
                        <Image
                          src="/images/logos/Asset1.png"
                          alt="Picture of the author"
                          width={200}
                          height={90}
                        />
                    </Box>
                        <AuthRegister
                            subtitle={
                                <Stack direction="row" justifyContent="center" spacing={1} mt={3}>
                                    <Typography color="textSecondary" variant="h6" fontWeight="400">
                                        Sudah punya akun?
                                    </Typography>
                                    <Typography
                                        component={Link}
                                        href="/authentication/login"
                                        fontWeight="500"
                                        sx={{ textDecoration: "none", color: "primary.main" }}
                                    >
                                        Sign In
                                    </Typography>
                                </Stack>
                            }
                        />
                    </Card>
                </Grid>
            </Grid>
        </Box>
    </PageContainer>
);

export default Register2;
