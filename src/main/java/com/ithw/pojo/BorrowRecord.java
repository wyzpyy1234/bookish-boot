package com.ithw.pojo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 对应 borrow_record 表（docs/01 的 4.6）。
 * 第 5 步 insert 用它当参数对象，新主键由 MyBatis 回写到 id 上。
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
//@Deprecated 已过时
public class BorrowRecord {
    private Integer id;
    private Integer readerId;
    private Integer copyId;
    private LocalDateTime borrowDate;
    private LocalDateTime dueDate;
    private LocalDateTime returnDate;
    private String status;
    private Integer renewCount;
}
