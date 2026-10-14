package com.ithw.service;
import com.ithw.dto.LoginUserDto;
import com.ithw.pojo.User;

public interface UserService {
    void register(User user);
    User getUserByUserName(String username);
    User login(LoginUserDto loginUserDto);

    User getUserByPassword(String password);
    User getById(Integer id);

    void updateAvatar(Integer id, String avatarUrl);

    /** 改密码：内部会校验原密码，不对就抛业务异常 */
    void changePassword(Integer id, String oldPassword, String newPassword);
}
