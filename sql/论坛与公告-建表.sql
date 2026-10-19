-- ==========================================================
-- Bookish · 论坛与公告 7 张表（TiDB Cloud / MySQL 8 通用）
-- 导入顺序：先执行 outputs/deploy/bookish_db.sql（借阅 7 表 + 种子），
--          再执行本文件。
-- 用法：在 TiDB Cloud 的 SQL Editor 里整段粘贴执行即可。
-- ==========================================================

CREATE DATABASE IF NOT EXISTS bookish_db DEFAULT CHARSET utf8mb4;
USE bookish_db;

-- ----------------------------
-- 1. 帖子表
-- status：0 待审核 / 1 已发布 / 2 已驳回 / -1 软删除
-- ----------------------------
CREATE TABLE IF NOT EXISTS forum_post (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL COMMENT '作者',
  title         VARCHAR(120) NOT NULL,
  content       TEXT NOT NULL,
  tag           VARCHAR(20)  NOT NULL DEFAULT 'general' COMMENT 'general/discussion/review/ask/share',
  is_top        TINYINT      NOT NULL DEFAULT 0,
  is_essence    TINYINT      NOT NULL DEFAULT 0,
  is_locked     TINYINT      NOT NULL DEFAULT 0,
  status        TINYINT      NOT NULL DEFAULT 0,
  view_count    INT          NOT NULL DEFAULT 0,
  like_count    INT          NOT NULL DEFAULT 0,
  comment_count INT          NOT NULL DEFAULT 0,
  last_reply_time DATETIME   NULL,
  create_time   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  reject_reason VARCHAR(255) NULL COMMENT '驳回理由',
  KEY idx_status_create (status, create_time),
  KEY idx_user (user_id),
  KEY idx_tag (tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='论坛帖子';

-- ----------------------------
-- 2. 帖子配图
-- ----------------------------
CREATE TABLE IF NOT EXISTS forum_post_image (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  url     VARCHAR(500) NOT NULL,
  sort_no INT NOT NULL DEFAULT 0,
  KEY idx_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='帖子配图';

-- ----------------------------
-- 3. 评论表（两级：parent_id 为空是一级，非空是回复）
-- ----------------------------
CREATE TABLE IF NOT EXISTS forum_comment (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  post_id         INT NOT NULL,
  user_id         INT NOT NULL,
  parent_id       INT NULL COMMENT '一级评论为 NULL',
  reply_to_user_id INT NULL COMMENT '被回复人，后端根据 parent_id 推导',
  content         VARCHAR(1000) NOT NULL,
  status          TINYINT NOT NULL DEFAULT 1 COMMENT '1 正常 / -1 删除',
  create_time     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_post (post_id),
  KEY idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='帖子评论';

-- ----------------------------
-- 4. 点赞表（唯一键保证一人一帖只能赞一次）
-- ----------------------------
CREATE TABLE IF NOT EXISTS forum_like (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  post_id     INT NOT NULL,
  user_id     INT NOT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_post_user (post_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='帖子点赞';

-- ----------------------------
-- 5. 举报表
-- target_type：post / comment
-- status：0 待处理 / 1 已处理
-- ----------------------------
CREATE TABLE IF NOT EXISTS forum_report (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  target_type   VARCHAR(20) NOT NULL,
  target_id     INT NOT NULL,
  reporter_id   INT NOT NULL,
  reason_type   VARCHAR(30) NOT NULL,
  reason        VARCHAR(500) NULL,
  status        TINYINT NOT NULL DEFAULT 0,
  handle_by     INT NULL,
  handle_time   DATETIME NULL,
  handle_action VARCHAR(20) NULL COMMENT 'delete_post/hide_comment/dismiss...',
  handle_remark VARCHAR(255) NULL,
  create_time   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_status (status, create_time),
  KEY idx_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='举报';

-- ----------------------------
-- 6. 公告表（纯文字，无配图）
-- ----------------------------
CREATE TABLE IF NOT EXISTS announcement (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  admin_id     INT NOT NULL,
  title        VARCHAR(120) NOT NULL,
  content      TEXT NOT NULL,
  type         VARCHAR(20) NOT NULL DEFAULT 'notice' COMMENT 'notice/event/system',
  is_top       TINYINT NOT NULL DEFAULT 0,
  status       TINYINT NOT NULL DEFAULT 1 COMMENT '1 已发布 / 0 下架',
  publish_time DATETIME NULL,
  create_time  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_status_publish (status, publish_time),
  KEY idx_top (is_top)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告';

-- ----------------------------
-- 7. 公告已读表（唯一键保证一人一公告只记一次）
-- ----------------------------
CREATE TABLE IF NOT EXISTS announcement_read (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  announcement_id INT NOT NULL,
  user_id         INT NOT NULL,
  read_time       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_ann_user (announcement_id, user_id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告已读记录';

-- ----------------------------
-- 演示种子数据（user_id 对应 bookish_db.sql 里的 users：1=admin 2=张三 3=李四）
-- 不想要演示帖可整段删掉
-- ----------------------------
INSERT INTO forum_post (id, user_id, title, content, tag, is_top, is_essence, status, view_count, like_count, comment_count, last_reply_time) VALUES
(1, 3, '《高性能MySQL》第 5 章讲索引讲得真透', 'B+ 树、最左前缀、覆盖索引讲得非常清楚，配了很多 EXPLAIN 例子。\n建议配合自己做的索引实验一起看，效果翻倍。', 'review', 1, 1, 1, 342, 27, 1, '2026-10-13 21:05:00'),
(2, 1, '【公告同步】10 月新增 40 本计算机类图书', '涵盖 Java、数据库、算法与 AI 方向，已上架 A 区 3 排。\n借阅规则不变：最多 5 本，借期 30 天。', 'share', 1, 0, 1, 198, 15, 0, '2026-10-09 10:12:00'),
(3, 2, '求推荐一本 Spring Boot 入门书', 'SSM 学完了，想直接上手 Spring Boot，有没有步骤少坑少的推荐？', 'ask', 0, 0, 1, 87, 6, 1, '2026-10-15 20:30:00');

INSERT INTO forum_comment (id, post_id, user_id, parent_id, reply_to_user_id, content, status) VALUES
(1, 1, 2, NULL, NULL, '同感！第 5 章的联合索引例子我照着做了 EXPLAIN，扫描行数真的从几千降到个位数。', 1),
(2, 3, 1, NULL, NULL, '官方文档 + 《Spring Boot 实战》就够了，重点是亲手把一个项目从 0 迁移过去。', 1);

INSERT INTO announcement (id, admin_id, title, content, type, is_top, status, publish_time) VALUES
(1, 1, '图书馆开放时间调整通知', '自本月起，开馆时间调整为 8:00 – 22:00，节假日不变。', 'notice', 1, 1, '2026-10-10 09:00:00');
