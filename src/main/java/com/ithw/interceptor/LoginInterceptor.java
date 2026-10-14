package com.ithw.interceptor;
import com.alibaba.fastjson2.JSON;
import com.ithw.pojo.Result;
import com.ithw.pojo.ResultCode;
import com.ithw.pojo.TokenUtils;
import com.ithw.pojo.User;
import org.springframework.web.servlet.HandlerInterceptor;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class LoginInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String token = request.getHeader("Authorization");
        if (token == null) {
            response.setContentType("application/json;charset=utf-8");
            response.getWriter().write(JSON.toJSONString(Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG,null)));
            return false;
        }
        User user = TokenUtils.getUser(token);
        if (user == null){
            response.setContentType("application/json;charset=utf-8");
            response.getWriter().write(JSON.toJSONString(Result.fail(ResultCode.NOT_LOGIN,"token失效",null)));
            return false;
        }
        request.setAttribute("loginUser",user);
        return true;
    }
}
