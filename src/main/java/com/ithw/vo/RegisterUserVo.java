package com.ithw.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RegisterUserVo {
    private String username;
    private String password;
    private String nickname;
    private String phone;
}
