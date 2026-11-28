import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Alert, Button, Skeleton } from "antd";
import { ReloadOutlined, WarningOutlined } from "@ant-design/icons";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { ROUTE_ENUMS } from "@/constants/enums";
import { staleAfterMs } from "@/constants/watch.constant";
import { menu } from "@/routes";
import { useDashboardStore } from "@/store/dashboard";
import { formatDateTime, formatFromNow, isOlderThan } from "@/utilities/date";
import styles from "./styles.module.less";

const appTitle = "Theo dõi Zalo";

function ScanStatus({ updatedAt }: { updatedAt: string | null }) {
  if (!updatedAt) return <div className={styles["updated"]}>Chưa có dữ liệu quét</div>;

  const isStale = isOlderThan(updatedAt, staleAfterMs);
  return (
    <div className={`${styles["updated"]} ${isStale ? styles["updated-stale"] : ""}`}>
      {isStale && <WarningOutlined aria-hidden />} Quét gần nhất:{" "}
      <time dateTime={updatedAt}>
        {formatFromNow(updatedAt)} ({formatDateTime(updatedAt)})
      </time>
      {isStale && ". Dữ liệu có thể đã cũ"}
    </div>
  );
}

export function AppLayout() {
  const data = useDashboardStore((state) => state.data);
  const error = useDashboardStore((state) => state.error);
  const refresh = useDashboardStore((state) => state.actions.refresh);
  // chỉ quay nút khi người dùng bấm; lần tự tải mỗi 30 giây diễn ra lặng lẽ
  const [refreshing, setRefreshing] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // số tin liên quan hiện trên tiêu đề tab trình duyệt để thấy ngay khi trang đang ở nền
  const related = data?.conversations.reduce((sum, item) => sum + item.recent.related, 0) ?? 0;
  useEffect(() => {
    document.title = related ? `(${related}) ${appTitle}` : appTitle;
  }, [related]);

  async function reload() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  function skipToContent(event: MouseEvent) {
    event.preventDefault();
    mainRef.current?.focus();
  }

  return (
    <div className={styles["app"]}>
      <a href="#main" className={styles["skip"]} onClick={skipToContent}>
        Bỏ qua tới nội dung
      </a>
      <header className={styles["header"]}>
        <div>
          <h1 className={styles["title"]}>{appTitle}</h1>
          {data && <ScanStatus updatedAt={data.updatedAt} />}
        </div>
        <div className={styles["actions"]}>
          <nav className={styles["nav"]} aria-label="Trang">
            {menu.map((item) => (
              <NavLink
                key={item.key}
                to={item.key}
                end
                className={({ isActive }) => `${styles["link"]} ${isActive ? styles["link-active"] : ""}`}
              >
                {item.icon} {item.label}
              </NavLink>
            ))}
          </nav>
          <Button
            size="large"
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={reload}
            aria-label="Tải lại dữ liệu (không quét Zalo)"
            title="Tải lại dữ liệu (không quét Zalo)"
          />
        </div>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1} className={styles["main"]}>
        {error && (
          <Alert
            type="error"
            showIcon
            title={error}
            className={styles["alert"]}
            action={
              <Button loading={refreshing} onClick={reload}>
                Thử lại
              </Button>
            }
          />
        )}

        {data ? (
          <Routes>
            {menu.map((item) => (
              <Route key={item.key} path={item.key} element={item.component} />
            ))}
            <Route path="*" element={<Navigate to={ROUTE_ENUMS.WATCH} replace />} />
          </Routes>
        ) : (
          !error && (
            <div aria-busy="true" aria-label="Đang tải dữ liệu">
              <Skeleton active paragraph={{ rows: 3 }} />
              <Skeleton active avatar paragraph={{ rows: 2 }} />
              <Skeleton active avatar paragraph={{ rows: 2 }} />
            </div>
          )
        )}
      </main>
    </div>
  );
}
