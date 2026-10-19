package com.ithw.dto;

import lombok.Data;
import java.util.List;

@Data
public class CreatePostDto {
    private String title;        // 标题（必填，≤120 字）
    private String content;      // 正文（必填，纯文本）
    private String tag;          // 标签（选填，非法值后端存 general）
    private List<String> images; // 配图地址数组（选填，最多 3 个；url 来自 6.6 上传接口）
}
