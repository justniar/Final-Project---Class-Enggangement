"use client";
import { styled, Container, Box, IconButton } from "@mui/material";
import React, { useState } from "react";
import Header from "@/app/(DashboardLayout)/layout/header/Header";
import Sidebar from "@/app/(DashboardLayout)/layout/sidebar/Sidebar";
import MenuIcon from '@mui/icons-material/Menu';

const MainWrapper = styled("div")(() => ({
  display: "flex",
  minHeight: "100vh",
  width: "100%",
}));

const PageWrapper = styled("div")(() => ({
  display: "flex",
  flexGrow: 1,
  paddingBottom: "60px",
  flexDirection: "column",
  zIndex: 1,
  backgroundColor: "transparent",
}));

interface Props {
  children: React.ReactNode;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <MainWrapper className="mainwrapper">
      {/* Sidebar */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onSidebarClose={() => setMobileSidebarOpen(false)}
      />
      {/* Main Wrapper */}
      <PageWrapper className="page-wrapper">
        {/* Header */}
        <Header toggleMobileSidebar={() => setMobileSidebarOpen(true)} />
        {/* Toggle Button for Desktop */}
        <IconButton
          onClick={toggleSidebar}
          sx={{
            position: 'absolute',
            left: isSidebarOpen ? '270px' : '0',
            transition: 'left 0.3s',
            zIndex: 1000,
          }}
        >
          <MenuIcon />
        </IconButton>
        {/* PageContent */}
        <Container
          sx={{
            paddingTop: "20px",
            maxWidth: "1200px",
          }}
        >
          {/* Page Route */}
          <Box sx={{ minHeight: "calc(100vh - 170px)" }}>{children}</Box>
          {/* End Page */}
        </Container>
      </PageWrapper>
    </MainWrapper>
  );
}
