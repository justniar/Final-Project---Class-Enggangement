import React, { useEffect, useState } from 'react';
import { Select, MenuItem } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DashboardCard from '@/components/shared/DashboardCard';
import dynamic from "next/dynamic";
import axios from 'axios';

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const API_URL = 'http://localhost:8080';

const MonitoringOverview = () => {
    const [month, setMonth] = useState('1');
    const [seriesData, setSeriesData] = useState([0, 0, 0, 0, 0, 0]);

    const handleChange = (event: any) => {
        setMonth(event.target.value);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${API_URL}/monitoring/count`);
                const data = response.data.data;

                const categories = ['bingung', 'bosan', 'fokus', 'frustasi', 'mengantuk', 'tidak-fokus'];
                const newSeriesData = categories.map(category => data[category] || 0);
                
                setSeriesData(newSeriesData);
            } catch (error) {
                console.error('Failed to fetch monitoring records count:', error);
            }
        };

        fetchData();
    }, []);

    // chart color
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const secondary = theme.palette.secondary.main;

    // chart
    const optionscolumnchart: any = {
        chart: {
            type: 'bar',
            fontFamily: "'Plus Jakarta Sans', sans-serif;",
            foreColor: '#adb0bb',
            toolbar: {
                show: true,
            },
            height: 370,
        },
        colors: [primary, secondary],
        plotOptions: {
            bar: {
                horizontal: false,
                barHeight: '60%',
                columnWidth: '42%',
                borderRadius: [6],
                borderRadiusApplication: 'end',
                borderRadiusWhenStacked: 'all',
            },
        },
        stroke: {
            show: true,
            width: 5,
            lineCap: "butt",
            colors: ["transparent"],
        },
        dataLabels: {
            enabled: false,
        },
        legend: {
            show: false,
        },
        grid: {
            borderColor: 'rgba(0,0,0,0.1)',
            strokeDashArray: 3,
            xaxis: {
                lines: {
                    show: false,
                },
            },
        },
        yaxis: {
            tickAmount: 4,
        },
        xaxis: {
            categories: ['bingung', 'bosan', 'fokus', 'frustasi', 'mengantuk', 'tidak-fokus'],
            axisBorder: {
                show: false,
            },
        },
        tooltip: {
            theme: 'dark',
            fillSeriesColor: false,
        },
    };
    const seriescolumnchart: any = [
        {
            name: 'Hasil monitoring bulan ini',
            data: seriesData,
        }
    ];

    return (
        <DashboardCard title="Monitoring" action={
            <Select
                labelId="month-dd"
                id="month-dd"
                value={month}
                size="small"
                onChange={handleChange}
            >
                <MenuItem value={1}>March 2024</MenuItem>
                <MenuItem value={2}>April 2024</MenuItem>
                <MenuItem value={3}>May 2024</MenuItem>
            </Select>
        }>
            <Chart
                options={optionscolumnchart}
                series={seriescolumnchart}
                type="bar"
                height={370}
                width={"100%"}
            />
        </DashboardCard>
    );
};

export default MonitoringOverview;
