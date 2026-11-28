import { BellFilled } from "@ant-design/icons";
import type { ConversationDTO } from "@/services/api/dashboard/types";
import styles from "../styles.module.less";

export function RecentChips({ item }: { item: ConversationDTO }) {
  return (
    <>
      {item.recent.related > 0 && (
        <span className={`${styles["chip"]} ${styles["chip-attention"]}`}>
          <BellFilled aria-hidden /> {item.recent.related} liên quan
        </span>
      )}
      {item.recent.count > 0 && (
        <span className={`${styles["chip"]} ${styles["chip-new"]}`}>{item.recent.count} tin mới</span>
      )}
      {item.unreadCount > 0 && <span className={styles["chip"]}>{item.unreadCount} chưa đọc</span>}
    </>
  );
}
