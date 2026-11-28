import { useState } from "react";
import { Collapse, Empty } from "antd";
import { useDashboardStore } from "@/store/dashboard";
import { formatReportDate } from "@/utilities/date";
import styles from "./styles.module.less";

export function ReportsPage() {
  const reports = useDashboardStore((state) => state.data?.reports);
  // null = người dùng chưa bấm: mở báo cáo mới nhất
  const [openKeys, setOpenKeys] = useState<string[] | null>(null);

  if (!reports?.length) {
    return (
      <Empty
        description={
          <>
            Chưa có báo cáo nào. Gõ <code>/zalo_report</code> trong Claude để tạo báo cáo, hoặc bật báo cáo cuối ngày
            bằng <code>/zalo_schedule</code>.
          </>
        }
      />
    );
  }

  return (
    <Collapse
      activeKey={openKeys ?? [reports[0].date]}
      onChange={(keys) => setOpenKeys(keys)}
      items={reports.map((report) => ({
        key: report.date,
        label: <strong>Báo cáo ngày {formatReportDate(report.date)}</strong>,
        // HTML do scripts/markdown.js tạo: mọi nội dung đã escape, chỉ cho liên kết http(s)
        children: <div className={styles["prose"]} dangerouslySetInnerHTML={{ __html: report.html }} />,
      }))}
    />
  );
}
