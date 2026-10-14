package com.ithw.service.impl;

import com.ithw.dao.UserDao;
import com.ithw.dto.LoginUserDto;
import com.ithw.pojo.User;
import com.ithw.service.UserService;
import org.springframework.stereotype.Service;

@Service
public class UserServiceImpl implements UserService {
    private UserDao userDao;
    public UserServiceImpl(UserDao userDao){
        this.userDao = userDao;
    }
    @Override
    public void register(User user) {
        userDao.register(user);
    }

    @Override
    public User getUserByUserName(String username) {
        return userDao.getUserByUserName(username);
    }

    @Override
    public User login(LoginUserDto loginUserDto) {
        return userDao.login(loginUserDto);
    }

    @Override
    public User getUserByPassword(String password) {
        return userDao.getUserByPassword(password);
    }
}
