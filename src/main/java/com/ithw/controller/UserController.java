package com.ithw.controller;

import com.ithw.dto.LoginUserDto;
import com.ithw.pojo.*;
import com.ithw.service.UserService;
import com.ithw.vo.LoginUserVo;
import com.ithw.vo.RegisterUserVo;
import org.springframework.beans.BeanUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class UserController {
    private UserService userService;
    public UserController(UserService userService){
        this.userService = userService;
    }
    @PostMapping("/register")
    public Result<Void> register(@RequestBody RegisterUserVo userVo){
        User user = new User();
        if ((userVo.getPassword() == null|| userVo.getUsername()==null ||userVo.getNickname()==null)
                || userVo.getPassword().length()<6){
            return Result.fail(ResultCode.PARAM_ERROR,ResultCode.PARAM_ERROR_MSG);
        }
        BeanUtils.copyProperties(userVo, user);
        user.setRole("reader");
        user.setMaxBorrow(5);
        if(userService.getUserByUserName(user.getUsername())!=null){
            return Result.fail(ResultCode.ACCOUNT_EXIST,ResultCode.ACCOUNT_EXIST_MSG);
        }
        userService.register(user);
        return Result.success();
    }

    @PostMapping("/login")
    public Result<ResultToken> login(@RequestBody LoginUserDto loginUserDto){
        if (loginUserDto.getUsername() == null||loginUserDto.getPassword() == null) {
            return Result.fail(ResultCode.PARAM_ERROR,ResultCode.PARAM_ERROR_MSG);
        }
        LoginUserVo loginUserVo = new LoginUserVo();
        String uuid = UUID.randomUUID().toString();
        User user1 =  userService.getUserByUserName(loginUserDto.getUsername());
        if (user1 == null){
            return Result.fail(ResultCode.USER_NOT_EXIST,ResultCode.USER_NOT_EXIST_MSG);
        }
        if (!user1.getPassword().equals(loginUserDto.getPassword())) {
            return Result.fail(ResultCode.PASSWORD_ERROR,ResultCode.PASSWORD_ERROR_MSG);
        }
        BeanUtils.copyProperties(user1,loginUserVo);
        TokenUtils.setToken(uuid,user1);

        return Result.success(new ResultToken(uuid,loginUserVo));
    }

    @PostMapping("/logout")
    public Result<Void> logout(HttpServletRequest request){
        String token = request.getHeader("Authorization");
        TokenUtils.removeToken(token);
        return Result.success();
    }


}
