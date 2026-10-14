package com.ithw.pojo;

import com.ithw.vo.LoginUserVo;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class ResultToken {
    private String token;
    private LoginUserVo user;

}
