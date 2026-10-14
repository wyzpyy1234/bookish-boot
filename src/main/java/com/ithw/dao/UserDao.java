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
    User getById(@Param("id") Integer id);

    int updateAvatar(@Param("id") Integer id, @Param("avatar") String avatar);

    int updatePassword(@Param("id") Integer id, @Param("password") String password);
}
