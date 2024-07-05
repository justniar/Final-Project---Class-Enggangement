
import {
    Typography, Box,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Chip
} from '@mui/material';
import DashboardCard from '@/components/shared/DashboardCard';

const studentMonitoring = [
    {
        id: "1",
        name: "Sunil Joshi",
        post: "Web Designer",
        pname: "Elite Admin",
        priority: "Low",
        pbg: "primary.main",
        budget: "3.9",
    },
    {
        id: "2",
        name: "Andrew McDownland",
        post: "Project Manager",
        pname: "Real Homes WP Theme",
        priority: "Medium",
        pbg: "secondary.main",
        budget: "24.5",
    },
    {
        id: "3",
        name: "Christopher Jamil",
        post: "Project Manager",
        pname: "MedicalPro WP Theme",
        priority: "High",
        pbg: "error.main",
        budget: "12.8",
    },
    {
        id: "4",
        name: "Nirav Joshi",
        post: "Frontend Engineer",
        pname: "Hosting Press HTML",
        priority: "Critical",
        pbg: "success.main",
        budget: "2.4",
    },
];


const StudentEnggagement = () => {
    return (

        <DashboardCard title="Monitoring Siswa">
            <Box sx={{ overflow: 'auto', width: { xs: '280px', sm: 'auto' } }}>
                <Table
                    aria-label="simple table"
                    sx={{
                        whiteSpace: "nowrap",
                        mt: 2
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Id
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    NIM
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Nama
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Perasaan
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Ekspresi
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Ketertarikan
                                </Typography>
                            </TableCell>
                            <TableCell align="right">
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Waktu Tercatat
                                </Typography>
                            </TableCell>
                            <TableCell align="right">
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Keterangan
                                </Typography>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {studentMonitoring.map((result) => (
                            <TableRow key={result.name}>
                                <TableCell>
                                    <Typography
                                        sx={{
                                            fontSize: "15px",
                                            fontWeight: "500",
                                        }}
                                    >
                                        {result.id}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={600}>
                                                {result.name}
                                            </Typography>
                                            <Typography
                                                color="textSecondary"
                                                sx={{
                                                    fontSize: "13px",
                                                }}
                                            >
                                                {result.post}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Typography color="textSecondary" variant="subtitle2" fontWeight={400}>
                                        {result.pname}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        sx={{
                                            px: "4px",
                                            backgroundColor: result.pbg,
                                            color: "#fff",
                                        }}
                                        size="small"
                                        label={result.priority}
                                    ></Chip>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="h6">${result.budget}k</Typography>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Box>
        </DashboardCard>
    );
};

export default StudentEnggagement;
