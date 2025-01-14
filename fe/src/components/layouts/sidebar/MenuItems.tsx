import {
  IconLayoutDashboard,
  IconLogin,
} from "@tabler/icons-react";

import { uniqueId } from "lodash";

const Menuitems = [
  {
    navlabel: true,
    subheader: "Home",
  },

  {
    id: uniqueId(),
    title: "Dashboard",
    icon: IconLayoutDashboard,
    href: "/dashboard-user",
  },
  {
    id: uniqueId(),
    title: "Real Time Monitoring",
    icon: IconLayoutDashboard,
    href: "/detection",
  },
  {
    id: uniqueId(),
    title: "Upload Video Monitoring",
    icon: IconLayoutDashboard,
    href: "/upload-detection",
  },
  {
    id: uniqueId(),
    title: "Ambil Dataset Wajah",
    icon: IconLayoutDashboard,
    href: "/capture",
  },
  {
    id: uniqueId(),
    title: "Manage Data User",
    icon: IconLayoutDashboard,
    href: "/manage",
  },
  {
    navlabel: true,
    subheader: "Auth",
  },
  {
    id: uniqueId(),
    title: "Logout",
    icon: IconLogin,
    href: "/authentication/login",
  },
];

export default Menuitems;
