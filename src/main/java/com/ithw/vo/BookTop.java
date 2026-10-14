package com.ithw.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class BookTop {
    private Integer id;
    private String title;
    private String author;
    private String categoryName;
    private String cover;
    private Integer borrowCount;
}
