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

    /** 注册身份：reader（默认）/ admin（必须同时提供正确的邀请码） */
    private String role;

    /** 管理员邀请码：仅 role=admin 时校验，读者传了就忽略 */
    private String inviteCode;
}
