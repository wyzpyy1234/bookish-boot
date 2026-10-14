package com.ithw.vo;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class LoginUserVo{
    private Integer id;
    private String username;
    private String nickname;
    private String phone;
    private String avatar;
    private String role;
    private Integer maxBorrow;
}
