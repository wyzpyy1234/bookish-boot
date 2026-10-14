package com.ithw.dao;
import com.ithw.dto.LoginUserDto;
import com.ithw.pojo.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface UserDao {
    void register(User user);

    User getUserByUserName(@Param("username") String username);
    User login(LoginUserDto loginUserDto);

    User getUserByPassword(@Param("password")String password);
}
