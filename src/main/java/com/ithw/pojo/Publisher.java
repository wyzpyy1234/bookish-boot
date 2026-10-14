package com.ithw.pojo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Publisher {
    private Integer id;
    private String name;
    private String address;
    private String phone;
}
