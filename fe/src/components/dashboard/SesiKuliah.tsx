
import DashboardCard from '@/components/shared/DashboardCard';
import {
  Timeline,
  TimelineItem,
  TimelineOppositeContent,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
  timelineOppositeContentClasses,
} from '@mui/lab';

const sesikuliah = [
  {
    waktu:"09.00",
    matakuliah:"Pemograman Dasar",
  },
  {
    waktu:"10.00",
    matakuliah:"Pemograman Bergerak",
  },
  {
    waktu:"11.00",
    matakuliah:"Logika Pemograman",
  },
  {
    waktu:"12.00",
    matakuliah:"Statisika",
  },
  {
    waktu:"13.00",
    matakuliah:"Kalkulus",
  },
  {
    waktu:"14.00",
    matakuliah:"Logika Pemograman",
  },
];

const SesiKuliah = () => {
  return (
    <DashboardCard title="Sesi Kuliah">
      <>
        <Timeline
          className="theme-timeline"
          nonce={undefined}
          onResize={undefined}
          onResizeCapture={undefined}
          sx={{
            p: 0,
            mb: '-40px',
            '& .MuiTimelineConnector-root': {
              width: '1px',
              backgroundColor: '#efefef'
            },
            [`& .${timelineOppositeContentClasses.root}`]: {
              flex: 0.5,
              paddingLeft: 0,
            },
          }}
        >
          {sesikuliah.map((sesi)=>(
            <TimelineItem>
            <TimelineOppositeContent>{sesi.waktu}</TimelineOppositeContent>
            <TimelineSeparator>
              <TimelineDot color="primary" variant="outlined" />
              <TimelineConnector />
            </TimelineSeparator>
            <TimelineContent>{sesi.matakuliah}</TimelineContent>
          </TimelineItem>
          ))}
        </Timeline>
      </>
    </DashboardCard>
  );
};

export default SesiKuliah;
