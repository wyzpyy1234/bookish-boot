package com.ithw.service.impl;

import com.ithw.dao.UserDao;
import com.ithw.dto.LoginUserDto;
import com.ithw.exception.BusinessException;
import com.ithw.pojo.ResultCode;
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

    @Override
    public User getById(Integer id) {
        return userDao.getById(id);
    }

    @Override
    public void updateAvatar(Integer id, String avatarUrl) {
        userDao.updateAvatar(id, avatarUrl);
    }

    @Override
    public void changePassword(Integer id, String oldPassword, String newPassword) {
        User u = userDao.getById(id);
        if (u == null) {
            throw new BusinessException(ResultCode.USER_NOT_EXIST, ResultCode.USER_NOT_EXIST_MSG);
        }
        // ★ 校验必须在后端做 —— 前端那道只是省一次无效请求，能被绕过
        if (!u.getPassword().equals(oldPassword)) {
            throw new BusinessException(ResultCode.PASSWORD_ERROR, "原密码不正确");
        }
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "新密码至少 6 位");
        }
        if (newPassword.equals(oldPassword)) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "新密码不能和原密码相同");
        }
        userDao.updatePassword(id, newPassword);
    }
}
