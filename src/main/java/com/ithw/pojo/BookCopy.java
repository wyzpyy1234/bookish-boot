package com.ithw.pojo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookCopy {
    private Integer id;
    private String barcode;
    private String status;
    private String location;
}
