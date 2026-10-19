package com.ithw.pojo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class User {
    private Integer id;
    private String username;
    private String password;
    private String nickname;
    private String phone;
    private String avatar;
    private String role;
    private Integer maxBorrow;
    private LocalDateTime createTime;
    private Integer status;
    private LocalDateTime muteUntil;
    private String muteReason;

}
