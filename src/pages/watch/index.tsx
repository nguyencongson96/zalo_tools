import { useEffect, useMemo, useRef } from "react";
import { Alert, Button, Empty, Input, Tabs } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { fixedTabs, narrowScreenQuery, watchFilters, watchParams } from "@/constants/watch.constant";
import { useMediaQuery } from "@/hooks";
import { useDashboardStore } from "@/store/dashboard";
import { useWatchStore } from "@/store/watch";
import { ConversationDetail } from "./components/ConversationDetail";
import { ConversationList } from "./components/ConversationList";
import { StatFilters } from "./components/StatFilters";
import { buildTabs, filterConversations, getRowId, withParams } from "./helper";
import styles from "./styles.module.less";
import type { WatchFilter } from "./types";

export function WatchPage() {
  const data = useDashboardStore((state) => state.data);
  const keyword = useWatchStore((state) => state.keyword);
  const setKeyword = useWatchStore((state) => state.actions.setKeyword);
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isNarrow = useMediaQuery(narrowScreenQuery);
  const tabs = useMemo(() => (data ? buildTabs(data) : []), [data]);

  const chatKey = params.get(watchParams.chat);
  const selected = data?.conversations.find((item) => item.key === chatKey) ?? null;
  const selectedKey = selected?.key ?? null;

  // màn hình hẹp: quay về danh sách thì đưa focus (và vị trí cuộn) về đúng hàng vừa mở
  const previousKey = useRef(selectedKey);
  useEffect(() => {
    if (isNarrow && !selectedKey && previousKey.current) {
      document.getElementById(getRowId(previousKey.current))?.focus();
    }
    previousKey.current = selectedKey;
  }, [isNarrow, selectedKey]);

  if (!data) return null;

  // nhóm đã bị xóa/đổi tên thì về "Tất cả"
  const requestedTab = params.get(watchParams.tab);
  const activeTab = tabs.find((tab) => tab.key === requestedTab) ?? tabs.find((tab) => tab.key === fixedTabs.all)!;
  const requestedFilter = params.get(watchParams.filter);
  const filter: WatchFilter = watchFilters.find((item) => item.value === requestedFilter)?.value ?? "all";
  const items = filterConversations(activeTab.items, filter, keyword);
  const isSearching = filter !== "all" || Boolean(keyword.trim());

  function updateParams(changes: Record<string, string | null>) {
    // giữ state để nút "Danh sách" vẫn biết có thể quay lại bằng lịch sử
    setParams(withParams(params, changes), { replace: true, state: location.state });
  }

  function changeFilter(value: WatchFilter) {
    updateParams({ [watchParams.filter]: value === "all" ? null : value });
  }

  function closeDetail() {
    if ((location.state as { fromList?: boolean } | null)?.fromList) navigate(-1);
    else updateParams({ [watchParams.chat]: null });
  }

  function clearSearch() {
    setKeyword("");
    changeFilter("all");
  }

  if (isNarrow && selected) {
    return <ConversationDetail key={selected.key} item={selected} onBack={closeDetail} />;
  }

  return (
    <>
      {!data.groups.length && (
        <Alert
          type="info"
          showIcon
          className={styles["hint"]}
          title="Chưa có nhóm nào"
          description={
            <>
              Gõ <code>/zalo_group</code> trong Claude: Claude liệt kê mọi hội thoại có đánh số, bạn trả lời kiểu
              “1-5, 9: Khách hàng” và mỗi nhóm sẽ thành một tab ở đây.
            </>
          }
        />
      )}

      <Tabs
        activeKey={activeTab.key}
        onChange={(key) =>
          updateParams({ [watchParams.tab]: key === fixedTabs.all ? null : key, [watchParams.chat]: null })
        }
        items={tabs.map((tab) => ({
          key: tab.key,
          label: (
            <span className={styles["tab"]}>
              {tab.label} <span className={styles["muted"]}>({tab.items.length})</span>
              {tab.newCount > 0 && (
                <span className={`${styles["chip"]} ${styles["chip-new"]}`}>
                  {tab.newCount}
                  <span className="sr-only"> tin mới</span>
                </span>
              )}
            </span>
          ),
        }))}
      />

      <StatFilters items={activeTab.items} value={filter} onChange={changeFilter} />

      <div className={styles["columns"]}>
        <section aria-label="Danh sách hội thoại">
          <Input
            allowClear
            size="large"
            prefix={<SearchOutlined aria-hidden />}
            placeholder="Tìm theo tên nhóm / người…"
            aria-label="Tìm theo tên"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <p className={styles["count"]} role="status">
            {items.length} hội thoại{isSearching && ` khớp, trên tổng ${activeTab.items.length}`}
          </p>
          {items.length ? (
            <ConversationList items={items} selectedKey={selectedKey} />
          ) : (
            <Empty description={isSearching ? "Không có hội thoại nào khớp" : "Chưa có hội thoại nào trong mục này"}>
              {isSearching && <Button onClick={clearSearch}>Xóa bộ lọc</Button>}
            </Empty>
          )}
        </section>

        {!isNarrow && (
          // key theo hội thoại: đổi hội thoại thì khung chi tiết cuộn lại từ đầu
          <section key={selectedKey ?? ""} className={styles["pane"]} aria-label="Chi tiết hội thoại">
            {selected ? (
              <ConversationDetail item={selected} />
            ) : (
              <Empty className={styles["placeholder"]} description="Chọn một hội thoại để xem lịch sử tin nhắn" />
            )}
          </section>
        )}
      </div>

      <p className={styles["note"]}>
        “Liên quan đến bạn” do script đánh giá bằng quy tắc (chat riêng, nhắc tên, từ khóa trong <code>me.json</code>),
        chỉ mang tính gợi ý. Dữ liệu tự tải lại mỗi 30 giây.
      </p>
    </>
  );
}
