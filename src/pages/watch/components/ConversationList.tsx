import { TeamOutlined } from "@ant-design/icons";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { watchParams } from "@/constants/watch.constant";
import type { ConversationDTO } from "@/services/api/dashboard/types";
import { formatDateTime, formatListTime } from "@/utilities/date";
import { getRowId, getSender, withParams } from "../helper";
import styles from "../styles.module.less";
import { Avatar } from "./Avatar";
import { RecentChips } from "./RecentChips";

interface ConversationListProps {
  items: ConversationDTO[];
  selectedKey: string | null;
}

function ConversationSummary({ item }: { item: ConversationDTO }) {
  const last = item.lastMessage;
  const sender = last && !["them", "unknown"].includes(last.from) ? getSender(last.from, item.name) : "";
  const time = item.lastChange ?? item.observedAt;
  const hasChips = item.recent.count > 0 || item.unreadCount > 0 || !item.watched;

  return (
    <>
      <Avatar name={item.name} />
      <span className={styles["row-main"]}>
        <span className={styles["row-top"]}>
          {item.isGroup && <TeamOutlined role="img" aria-label="Nhóm" className={styles["muted"]} />}
          <span className={styles["row-name"]} title={item.name}>
            {item.name}
          </span>
          {time && (
            <time className={styles["when"]} dateTime={time} title={formatDateTime(time)}>
              {formatListTime(time)}
            </time>
          )}
        </span>
        <span className={styles["snippet"]}>
          {sender && <strong>{sender}: </strong>}
          {last?.text || item.preview || "Chưa có dữ liệu"}
        </span>
        {hasChips && (
          <span className={styles["chips"]}>
            <RecentChips item={item} />
            {!item.watched && <span className={styles["chip"]}>Không theo dõi</span>}
          </span>
        )}
      </span>
    </>
  );
}

export function ConversationList({ items, selectedKey }: ConversationListProps) {
  const [params] = useSearchParams();
  const location = useLocation();

  return (
    <ul className={styles["list"]}>
      {items.map((item) => (
        <li key={item.key}>
          <Link
            id={getRowId(item.key)}
            to={{ search: withParams(params, { [watchParams.chat]: item.key }).toString() }}
            // đang mở sẵn một hội thoại thì thay mục lịch sử, để nút Back luôn quay về danh sách
            replace={Boolean(selectedKey)}
            state={selectedKey ? location.state : { fromList: true }}
            aria-current={item.key === selectedKey ? "true" : undefined}
            className={`${styles["row"]} ${item.recent.related ? styles["row-attention"] : ""}`}
          >
            <ConversationSummary item={item} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
