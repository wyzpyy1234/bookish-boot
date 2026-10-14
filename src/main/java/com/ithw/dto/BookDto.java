package com.ithw.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookDto {
    private String keyword;
    private Integer categoryId;
    private Integer publisherId;
    private Boolean onlyAvailable;
    private String sort;
    private Integer page;
    private Integer size;
    private Integer offset;
}
