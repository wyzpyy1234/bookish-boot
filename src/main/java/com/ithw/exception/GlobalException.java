package com.ithw.exception;

import com.ithw.pojo.Result;
import com.ithw.pojo.ResultCode;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class GlobalException {
    private static final Log log = LogFactory.getLog(GlobalException.class);

    @ExceptionHandler(BusinessException.class)
    public Result<Void> businessException(BusinessException b){
        log.warn("业务异常 code=" + b.getCode() + ", msg=" + b.getMsg());
        return Result.fail(b.getCode(),b.getMsg());
    }

    @ExceptionHandler(Exception.class)
    public Result<Void> exception(Exception e){
        log.error("系统异常",e);
        return Result.fail(ResultCode.SERVICE_ERROR,ResultCode.SERVICE_ERROR_MSG);
    }
    /** 上传文件超限（multipart 大小限制被击穿时抛的是这个） */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public Result<Void> maxUploadSize(MaxUploadSizeExceededException e) {
        log.warn("上传文件超过限制: " + e.getMessage());
        return Result.fail(ResultCode.PARAM_ERROR, "图片太大了，请选择 2MB 以内的图片");
    }
}
