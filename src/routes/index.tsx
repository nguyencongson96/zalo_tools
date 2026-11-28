import type { JSX } from "react";
import { FileTextOutlined, MessageOutlined } from "@ant-design/icons";
import { ROUTE_ENUMS } from "@/constants/enums";
import { ReportsPage } from "@/pages/reports";
import { WatchPage } from "@/pages/watch";

export interface MenuItem {
  key: ROUTE_ENUMS;
  label: string;
  icon: JSX.Element;
  component: JSX.Element;
}

export const menu: MenuItem[] = [
  { key: ROUTE_ENUMS.WATCH, label: "Theo dõi", icon: <MessageOutlined />, component: <WatchPage /> },
  { key: ROUTE_ENUMS.REPORTS, label: "Báo cáo", icon: <FileTextOutlined />, component: <ReportsPage /> },
];
