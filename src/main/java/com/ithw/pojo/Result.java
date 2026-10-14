package com.ithw.pojo;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
@AllArgsConstructor
@NoArgsConstructor
@Data
public class Result<T> {
    private Integer code;
    private String message;
    private T data;

    public static <T>Result<T>success(T data){
        return new Result<>(ResultCode.SUCCESS,"请求成功",data);
    }
    public static <T>Result<T>success(){
        return success(null);
    }

    public static <T>Result<T>fail(Integer code,String message,T data){
        return new Result<>(code,message,data);
    }
    public static <T>Result<T>fail(Integer code,String message){
        return fail(code,message,null);
    }
    public static <T>Result<T>fail(Integer code,T data){
        return fail(code,"请求失败",data);
    }
}
