package com.ithw.vo;

import lombok.Data;
import java.util.List;

@Data
public class CommentListVo {
    private Integer total;            // 总条数（⚠️ 只数「一级评论」的条数）
    private Integer page;             // 当前页
    private Integer size;             // 每页几条
    private List<CommentVo> list;     // ⚠️ 字段名是 list
}