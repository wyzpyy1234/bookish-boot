package com.ithw.exception;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException{
    private static final long serialVersionUID = 1L;

    private final Integer code;
    private final String msg;

    public BusinessException(Integer code, String msg) {
        super(msg);          // 存进 Throwable.message，日志里能直接看到
        this.code = code;
        this.msg = msg;
    }

}
