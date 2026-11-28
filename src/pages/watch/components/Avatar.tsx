import { getHue, getInitial } from "../helper";
import styles from "../styles.module.less";

export function Avatar({ name }: { name: string }) {
  // độ sáng 30% để chữ trắng đủ tương phản ở mọi sắc độ
  return (
    <span className={styles["avatar"]} style={{ background: `hsl(${getHue(name)} 55% 30%)` }} aria-hidden>
      {getInitial(name)}
    </span>
  );
}
