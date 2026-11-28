import { useEffect, useRef, useState } from "react";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Switch } from "antd";
import { relevanceLabels } from "@/constants/watch.constant";
import type { ConversationDTO } from "@/services/api/dashboard/types";
import { formatDateTime } from "@/utilities/date";
import { isRelatedEntry } from "../helper";
import styles from "../styles.module.less";
import { Avatar } from "./Avatar";
import { MessageTimeline } from "./MessageTimeline";
import { RecentChips } from "./RecentChips";

interface ConversationDetailProps {
  item: ConversationDTO;
  /** Có khi chi tiết chiếm cả màn hình (màn hình hẹp). */
  onBack?: () => void;
}

function History({ item }: { item: ConversationDTO }) {
  const [onlyRelated, setOnlyRelated] = useState(false);
  const hasRelated = item.history.some((entry) => entry.type === "msg" && isRelatedEntry(entry));

  if (!item.history.length) {
    return <p className={styles["muted"]}>Chưa ghi nhận tin mới nào kể từ khi bắt đầu theo dõi.</p>;
  }

  const isFiltered = onlyRelated && hasRelated;
  return (
    <>
      <div className={styles["history-head"]}>
        <h3 className={styles["history-title"]}>
          Lịch sử <span className={styles["muted"]}>· mới nhất trước</span>
        </h3>
        {hasRelated && (
          <label className={styles["toggle"]}>
            <Switch checked={onlyRelated} onChange={setOnlyRelated} />
            Chỉ tin liên quan
          </label>
        )}
      </div>
      <MessageTimeline
        key={String(isFiltered)}
        history={isFiltered ? item.history.filter(isRelatedEntry) : item.history}
        chatName={item.name}
      />
    </>
  );
}

export function ConversationDetail({ item, onBack }: ConversationDetailProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isFullScreen = Boolean(onBack);
  const last = item.lastMessage;

  useEffect(() => {
    if (!isFullScreen) return;
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, [isFullScreen]);

  return (
    <article className={styles["detail"]}>
      {onBack && (
        <Button icon={<ArrowLeftOutlined />} onClick={onBack} className={styles["back"]}>
          Danh sách
        </Button>
      )}
      <header className={styles["detail-head"]}>
        <Avatar name={item.name} />
        <div className={styles["row-main"]}>
          <h2 ref={headingRef} tabIndex={-1} className={styles["detail-name"]}>
            {item.name}
          </h2>
          <div className={styles["chips"]}>
            <span className={styles["chip"]}>{item.isGroup ? "Nhóm" : "Riêng"}</span>
            <span className={styles["chip"]}>{item.watched ? "Đang theo dõi" : "Không theo dõi"}</span>
            {item.muted && <span className={styles["chip"]}>Đã tắt thông báo</span>}
            <RecentChips item={item} />
          </div>
        </div>
      </header>

      <dl className={styles["facts"]}>
        <dt>Nhóm của bạn</dt>
        <dd>{item.groups.length ? item.groups.join(", ") : "Chưa phân nhóm"}</dd>
        {last && (
          <>
            <dt>Đánh giá tin cuối</dt>
            <dd>
              <strong className={last.rel === "yes" ? styles["attention-text"] : undefined}>
                {relevanceLabels[last.rel]}
              </strong>
              {last.why && <span className={styles["muted"]}> ({last.why})</span>}
            </dd>
          </>
        )}
        <dt>Quét lúc</dt>
        <dd>{formatDateTime(item.observedAt)}</dd>
      </dl>

      {item.watched ? (
        <History item={item} />
      ) : (
        <>
          {item.preview && <p className={styles["preview"]}>{item.preview}</p>}
          <p className={styles["muted"]}>
            Hội thoại này không nằm trong danh sách theo dõi nên chỉ có dòng xem trước. Muốn đọc đầy đủ, nhờ Claude thêm
            vào theo dõi (<code>/zalo_watchlist</code>).
          </p>
        </>
      )}
    </article>
  );
}
