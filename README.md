# Bookish · 图书馆借阅与社区管理系统

一个前后端一体的图书馆系统：左侧是「借书 / 还书 / 续借 / 罚款」的业务主线，右侧是「论坛 + 公告 + 举报 + 审核」的社区能力，管理员在同一个后台里管图书、管借阅、管内容、管用户。

- 后端：Spring Boot 2.7.18 + MyBatis + MySQL 8 + Druid
- 前端：原生 HTML / CSS / JavaScript，无框架、无构建步骤，由 Spring Boot 直接托管
- 规模：83 个 Java 文件 / 约 4000 行、51 个 REST 接口、14 张表、7 个页面
- 仓库：<https://github.com/wyzpyy1234/bookish-boot>

> 这是我在学完 SSM 后，把同一套业务用 Spring Boot 重写一遍的练手项目。早期版本是 Spring + SpringMVC + MyBatis 的 war 包，这个仓库是 Boot 版，接口行为与前端保持一致。

---

## 一、功能

### 1. 借阅域（读者）

| 功能 | 说明 |
|---|---|
| 图书检索 | 按书名 / 作者模糊搜索，按分类、出版社、是否有货筛选，支持价格升降、借阅最多排序与分页 |
| 图书详情 | 书目信息 + 馆藏副本 + 当前可借数量 + 借阅热度 |
| 借书 | 一次借一本，受「最大可借数」限制；有逾期未还时不能借；没有可借副本时拦下 |
| 还书 | 按记录归还，自动算逾期天数并生成罚款单 |
| 续借 | 未逾期才可续借，每本最多续借 2 次，到期日顺延 |
| 我的借阅 | 在借 / 历史 / 逾期三种视图 + 汇总统计 + 罚款明细 |
| 个人中心 | 改昵称手机号、改密码、上传头像 |

### 2. 社区域（论坛 + 公告）

| 功能 | 说明 |
|---|---|
| 发帖 | 标题 + 正文 + 标签 + 最多 3 张配图；**普通用户发帖进审核队列，管理员发帖免审** |
| 帖子列表 | 最新 / 最热 / 最近回复三种排序，标签、精华、我的帖子筛选，置顶优先 |
| 帖子详情 | 浏览数自增、点赞、两级评论、举报 |
| 编辑 / 删除 | 作者可编辑自己的帖（锁帖后不可编辑）、软删除；管理员可操作任意帖 |
| 评论 | 支持回复某条评论（`parentId`），后端反查被回复人，二级展示 |
| 点赞 | 一人一帖一赞，再次点击取消，计数原子增减 |
| 举报 | 帖子 / 评论都能举报，同一目标同一人只能报一次 |
| 公告 | 通知 / 规则 / 活动三类，置顶排序，详情自动记已读，支持未读数与一键全部已读 |

### 3. 管理后台

| 模块 | 能力 |
|---|---|
| 统计看板 | 图书种类 / 馆藏册数 / 注册读者 / 当前在借 / 逾期 / 今日借出 / 待缴罚款 / 帖子与待办数，分类借阅量与月度趋势图 |
| 图书管理 | 新增（自动按副本数生成唯一条码）、编辑、删除（有借阅记录禁止删） |
| 借阅流水 | 按读者 / 书名 / 条码搜索，按状态筛选 |
| 帖子审核 | 待审核队列，通过 / 驳回（驳回理由回显给作者，作者改完可重新提交） |
| 举报处理 | 驳回举报 / 隐藏内容 / 删除内容 / 隐藏并禁言作者 |
| 用户与禁言 | 搜索用户，禁言（1/3/7/30 天或永久 + 理由）、改时长、解除禁言 |
| 公告管理 | 发布、编辑、下架、置顶、删除（软删，已读记录保留） |

---

## 二、技术栈

| 层次 | 选型 | 版本 | 说明 |
|---|---|---|---|
| 语言 | Java | 17 | |
| 框架 | Spring Boot | 2.7.18 | 保留 `javax.servlet`，从 SSM 迁移时代码零改动 |
| 持久层 | MyBatis Starter | 2.3.2 | XML 写 SQL，`map-underscore-to-camel-case` |
| 连接池 | Druid | 1.2.20 | 初始 5 / 最大 20 |
| 数据库 | MySQL | 8.x | 库名 `bookish_db` |
| JSON | fastjson2 | 2.0.65 | 拦截器里手写 401 响应体（接口序列化仍由 Jackson 负责） |
| 工具 | Lombok | 随 Boot | `@Data` 生成 getter/setter |
| 前端 | 原生 HTML/CSS/JS | - | 7 个页面 + 9 个 js 模块，无框架 |
| 测试 | jsdom 回归脚本 | - | 191 条断言覆盖论坛 / 公告 / 后台交互 |

---

## 三、快速开始

### 1. 环境

- JDK 17
- Maven 3.6+（仓库自带 `mvnw`，也可以直接用）
- MySQL 8.x

### 2. 建库建表

```sql
CREATE DATABASE bookish_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

借阅域 7 张表（users / category / publisher / book / book_copy / borrow_record / fine）的完整 DDL、索引设计与种子数据在：

```
src/main/resources/sql/数据库设计.md
```

社区域 7 张表（forum_post / forum_post_image / forum_comment / forum_like / forum_report / announcement / announcement_read）的字段、索引与唯一键见本文第六节，按表建好即可（不建外键也能跑，建了更安全）。

### 3. 配置数据库密码

`src/main/resources/application.yml` 里密码走环境变量，不写明文：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/bookish_db?serverTimezone=GMT%2B8&useSSL=false&characterEncoding=UTF-8&allowPublicKeyRetrieval=true
    username: root
    password: ${DB_PASSWORD}
```

启动前设置环境变量：

```bash
# macOS / Linux
export DB_PASSWORD=你的密码

# Windows PowerShell
$env:DB_PASSWORD="你的密码"
```

> IDEA 里跑的话，在 Run Configuration → Environment variables 里加一条 `DB_PASSWORD=你的密码` 即可。

### 4. 启动

```bash
./mvnw spring-boot:run
# 或
mvn spring-boot:run
```

启动后访问 <http://localhost:8080/login.html>。

### 5. 演示账号

| 账号 | 密码 | 角色 | 说明 |
|---|---|---|---|
| `admin` | `123456` | 管理员 | 全部后台权限 |
| `zhangsan` | `123456` | 读者 | 有借阅记录 |
| `wangwu` | `123456` | 读者 | 第二个读者账号，可用来验证禁言 / 举报流程 |

---

## 四、配置项

| 配置 | 默认值 | 说明 |
|---|---|---|
| `server.port` | `8080` | 未显式配置时用 Boot 默认值 |
| `spring.datasource.password` | `${DB_PASSWORD}` | 必须由环境变量提供 |
| `spring.servlet.multipart.max-file-size` | `2MB` | 单文件上限 |
| `spring.servlet.multipart.max-request-size` | `10MB` | 单次请求上限 |
| `bookish-boot.upload.dir` | `./uploads` | 上传文件落盘目录，通过 `/uploads/**` 对外访问 |

---

## 五、接口设计

### 统一返回

```json
{ "code": 200, "message": "成功", "data": {} }
```

- 成功一律 `code=200`；业务失败也返回 HTTP 200，用 `code` 区分
- `401` 例外：前端收到后清登录态并跳登录页
- 业务异常统一 `throw new BusinessException(code, msg)` —— 它是 `RuntimeException`，`@Transactional` 才会回滚；Service 层不会 `return Result.fail(...)`（那样事务不回滚，会留脏数据）

### 认证

- 登录成功返回 UUID token，服务端存在 `ConcurrentHashMap` 里（`TokenUtils`）
- 前端把 token 放在 `Authorization` 请求头
- 拦截器只拦 `/api/**`，放行 `/api/login`、`/api/register`
- **不放行 HTML**：浏览器导航带不上自定义请求头，拦了就是白屏。「页面能不能打开」交给前端守卫，「数据能不能拿到」交给拦截器 + SQL

### 错误码分段

| 段 | 范围 | 例子 |
|---|---|---|
| 401 / 403 | 登录态 / 权限 | 401 未登录或 token 失效（前端跳登录页）；403 角色不够（普通读者碰管理接口） |
| 1xxx | 参数 / 用户 | 1001 用户不存在、1003 资源不存在、1004 参数错误 |
| 2xxx | 借阅 | 2002 超出可借上限、2006 图书有借阅记录不能删、2007 已禁言、2008 帖子已锁定 |
| 3xxx | 论坛 | 3001 帖子不存在、3003 只能操作自己的内容、3008 不在待审核状态 |
| 4xxx | 公告 | 4001 公告不存在 |

### 接口一览（51 个）

| 分组 | 数量 | 主要路径 |
|---|---|---|
| 认证与用户 | 9 | `/api/register`、`/api/login`、`/api/logout`、`/api/user/profile`、`/api/user/avatar`、`/api/user/password`、`/api/upload` |
| 图书与借阅 | 15 | `/api/categories`、`/api/publishers`、`/api/books`、`/api/books/{id}`、`/api/books/hot`、`/api/borrows`、`/api/borrows/{id}/return`、`/api/borrows/{id}/renew`、`/api/admin/books`、`/api/admin/borrows`、`/api/admin/stats` |
| 论坛 | 11 | `/api/forum/stats`、`/api/forum/posts`、`/api/forum/posts/{id}`、`/api/forum/posts/{id}/comments`、`/api/forum/comments/{id}`、`/api/forum/posts/{id}/like`、`/api/forum/reports` |
| 论坛管理 | 8 | `/api/forum/admin/posts/{id}/approve`、`/api/forum/admin/posts/{id}/reject`、`/api/admin/forum/posts/{id}/flags`、`/api/admin/forum/reports`、`/api/admin/users`、`/api/admin/users/{id}/mute` |
| 公告 | 5 | `/api/announcements`、`/api/announcements/{id}`、`/api/announcements/{id}/read`、`/api/announcements/unread-count`、`/api/announcements/read-all` |
| 公告管理 | 3 | `POST/PUT/DELETE /api/admin/announcements` |

---

## 六、数据库设计（14 张表）

### 借阅域

| 表 | 作用 | 关键点 |
|---|---|---|
| `users` | 用户（读者 + 管理员） | `role` 区分角色；`status=0` 表示禁言，配合 `mute_until` 懒判断 |
| `category` / `publisher` | 分类 / 出版社字典 | 名称唯一 |
| `book` | 书目信息 | ISBN 唯一，**不是可借对象** |
| `book_copy` | 馆藏副本 | 每本实体书一行，`barcode` 唯一，扫码借书靠它 |
| `borrow_record` | 借阅流水 | 谁借了哪个副本、应还 / 实还、状态 |
| `fine` | 罚款 | 按逾期天数计算，标记是否已缴 |

### 社区域

| 表 | 作用 | 关键点 |
|---|---|---|
| `forum_post` | 帖子 | `status` 0 待审 / 1 已发布 / 2 已驳回 / -1 软删；`reject_reason` 存驳回理由 |
| `forum_post_image` | 帖子配图 | `post_id + sort_no`，先传图拿 URL 再发帖 |
| `forum_comment` | 评论 | `parent_id` 做两级；`reply_to_user_id` 由后端反查，不信前端 |
| `forum_like` | 点赞 | `(post_id, user_id)` 唯一键，重复点赞靠它兜 |
| `forum_report` | 举报 | 帖子 / 评论通用，`target_type + target_id` |
| `announcement` | 公告 | `type` 通知 / 规则 / 活动，`is_top` 置顶 |
| `announcement_read` | 已读记录 | `(announcement_id, user_id)` 唯一，未读数靠它算 |

### 索引设计的三个重点

1. `book_copy(book_id, status)` 联合索引 —— 支撑「这本书还有几本可借」
2. `borrow_record(reader_id, status)` 联合索引 —— 支撑「我的在借书籍」
3. `borrow_record(copy_id, return_date)` —— 判断「这个副本现在还借出去没有」

做过 6 组 `EXPLAIN` 实验（联合索引生效、最左前缀、覆盖索引、深分页、`LIKE` 走不走索引、六表 JOIN 的驱动表），把「我的在借书籍」这类查询从全表扫描几千行降到索引定位个位数行，过程记录在 `sql/数据库设计.md` 第八节。

---

## 七、项目结构

```
bookish-boot
├── src/main/java/com/ithw
│   ├── controller        # BookController（图书借阅 15 个）/ UserController（用户社区 36 个）
│   ├── service           # 接口 + impl 实现（事务边界在这一层）
│   ├── dao               # MyBatis Mapper 接口（2 个）
│   ├── dto               # 入参对象 21 个
│   ├── vo                # 出参对象 32 个（详情 / 列表 / 汇总各司其职）
│   ├── pojo              # 实体 + Result + ResultCode + TokenUtils
│   ├── interceptor       # LoginInterceptor：登录校验 + 塞 loginUser 进 request
│   ├── exception         # BusinessException + 全局异常处理
│   └── config            # WebConfig：拦截器注册 + 上传目录映射
├── src/main/resources
│   ├── application.yml
│   ├── mapper            # SQL：BookMapper.xml（25 条）/ UserMapper.xml（63 条）
│   ├── sql               # 数据库设计文档（DDL + 索引 + 种子 + 实验）
│   └── static            # 前端 7 页 + css + 9 个 js
└── pom.xml
```

---

## 八、几个值得说的实现点

**1. 权限分三层，不是一层 if**

- 角色粗筛在 Controller：`role != admin` 直接返回 `code=403`
- 归属校验在 Service：不是作者、不是管理员就 `throw 3003`
- 数据隔离在 SQL：`WHERE user_id = #{me}`，越权连数据都查不出来

**2. 归属字段一律从 token 取**

`loginUser` 由拦截器放进 request 域，Service 里凡是查询 DTO 带归属字段的，**无条件用 token 里的用户覆盖**——否则前端传 `?readerId=999` 就能看别人的借阅记录。

**3. 审核状态机**

发帖 → `status=0` 待审；`approve` 时 SQL 带 `AND status=0`，两个管理员同时点只有一个成功；`reject` 写理由；作者编辑后重新回到 0。可见性全在 Service 判：别人只能看到 1，作者能看自己的 0 和 2；管理员按 `status` 筛选（默认已发布，审核页传 0）。

**4. 两级评论不用 N+1**

先查根评论 → 收集 id → 一条 `IN` 查出所有子评论 → 内存里按 `parentId` 分堆挂到父节点（`Map.get/put` 加 for 循环，不玩 stream）。避免 JOIN 把分页切碎，也避免每条根评论再查一次子评论。

**5. 点赞幂等**

唯一键 `(post_id, user_id)` 兜底：插入成功说明是点赞，捕获 `DuplicateKeyException` 就转成删除。计数用 SQL 原子 `±1`，不在 Java 里读出来加一再写回。

**6. 公告「全部已读」一条 SQL 搞定**

`INSERT INTO announcement_read (...) SELECT ... FROM announcement a LEFT JOIN announcement_read r ON ... AND r.user_id = ? WHERE r.id IS NULL` —— 顺手把已读的过滤掉，不用先查再循环插。

---

## 九、前端说明

页面：`login / index（首页与检索）/ borrows / profile / forum / announcements / admin`。

- `js/api.js` 顶部有开关（本仓库已设为 `false`）：

```js
const USE_MOCK = false;  // true = 用 mock.js 假数据离线预览；false = 调真实后端
```

本仓库是前后端一体的工程，静态页放在 `src/main/resources/static`，所以默认 `false`，直接对着本项目接口跑。**想不启动后端只看界面**，把它改成 `true`，用 `admin / 123456` 等演示账号登录即可；接后端时记得改回 `false`，否则看到的全是假数据。

- 请求层统一 `request(method, path, body)`，401 自动清登录态跳登录页
- 上传走 XHR + FormData（不设 `Content-Type`，让浏览器自己带 boundary）
- 论坛详情用 hash 路由 `#/p/{id}`，刷新不 404

---

## 十、已知限制与后续计划

- **Token 存在服务端内存**：重启即失效，多实例不通用。生产应换 JWT 或 Redis
- **密码明文存储**：练手项目未加盐哈希，正式项目应上 BCrypt
- **禁言是懒判断**：到期不会自动改 `status`，而是在发帖 / 评论时比对 `mute_until`，管理后台已按「已到期」单独标记
- **单元测试缺失**：目前只有前端 jsdom 回归脚本（191 条断言），后端接口靠手工 + Postman 验证
- **尚未部署上线**：计划 Render + 云 MySQL，`application.yml` 的 `url` 需要改成环境变量

## License

学习用途项目，未指定开源协议。
