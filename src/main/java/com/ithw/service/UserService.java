package com.ithw.service;
import com.ithw.dto.LoginUserDto;
import com.ithw.pojo.User;

public interface UserService {
    void register(User user);
    User getUserByUserName(String username);
    User login(LoginUserDto loginUserDto);

    User getUserByPassword(String password);
}
