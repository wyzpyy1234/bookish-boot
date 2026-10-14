package com.ithw.controller;

import com.ithw.dto.ChangePasswordDto;
import com.ithw.dto.LoginUserDto;
import com.ithw.pojo.*;
import com.ithw.service.UserService;
import com.ithw.vo.LoginUserVo;
import com.ithw.vo.RegisterUserVo;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class UserController {
    private static final Log log = LogFactory.getLog(UserController.class);
    @Value("${bookish-boot.upload.dir:./uploads}")
    private String uploadDir;
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

    @GetMapping("/user/profile")
    public Result<User> profile(HttpServletRequest request) {
        User loginUser = (User) request.getAttribute("loginUser");
        User db = userService.getById(loginUser.getId());
        if (db == null) {
            return Result.fail(ResultCode.USER_NOT_EXIST, ResultCode.USER_NOT_EXIST_MSG);
        }
        db.setPassword(null);          // ★ 绝对不能把密码吐给前端
        return Result.success(db);
    }

    /** 上传头像 */
    @PostMapping("/user/avatar")
    public Result<Map<String, String>> uploadAvatar(@RequestParam("file") MultipartFile file,
                                                    HttpServletRequest request) throws IOException {
        if (file == null || file.isEmpty()) {
            return Result.fail(ResultCode.PARAM_ERROR, "请选择要上传的图片");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return Result.fail(ResultCode.PARAM_ERROR, "只能上传图片");
        }
        if (file.getSize() > 2 * 1024 * 1024) {
            return Result.fail(ResultCode.PARAM_ERROR, "图片不能超过 2MB");
        }

        // 1) 文件名：UUID + 白名单扩展名（不要用用户传来的原文件名，原因见第 8 节）
        String fileName = UUID.randomUUID().toString().replace("-", "") + extensionOf(file.getOriginalFilename());

        // 2) 落盘。★ 必须 getAbsoluteFile()：
        //    file.transferTo() 对相对路径是相对【临时目录】解析的，会存到你意想不到的地方
        File dir = new File(uploadDir, "avatar").getAbsoluteFile();
        if (!dir.exists() && !dir.mkdirs()) {
            return Result.fail(ResultCode.SERVICE_ERROR, "创建上传目录失败");
        }
        File dest = new File(dir, fileName);
        file.transferTo(dest);

        String url = "/uploads/avatar/" + fileName;

        User loginUser = (User) request.getAttribute("loginUser");
        String oldAvatar = loginUser.getAvatar();

        userService.updateAvatar(loginUser.getId(), url);
        deleteOldAvatar(oldAvatar);         // 删掉上一张，别让磁盘无限长

        // 3) ★★ 这一步最容易漏：
        //    TokenUtils 里存的是【User 对象的快照】，不改它的话，
        //    本次会话后续请求从拦截器拿到的还是旧对象（avatar 仍是 null）
        User fresh = userService.getById(loginUser.getId());
        if (fresh != null) {
            fresh.setPassword(null);
            TokenUtils.setToken(request.getHeader("Authorization"), fresh);
        }

        Map<String, String> data = new HashMap<>();
        data.put("avatar", url);
        return Result.success(data);
    }

    /** 删除头像（恢复默认） */
    @DeleteMapping("/user/avatar")
    public Result<Void> removeAvatar(HttpServletRequest request) {
        User loginUser = (User) request.getAttribute("loginUser");
        userService.updateAvatar(loginUser.getId(), null);
        deleteOldAvatar(loginUser.getAvatar());

        User fresh = userService.getById(loginUser.getId());
        if (fresh != null) {
            fresh.setPassword(null);
            TokenUtils.setToken(request.getHeader("Authorization"), fresh);
        }
        return Result.success();
    }

    /** 修改密码 */
    @PutMapping("/user/password")
    public Result<Void> changePassword(@RequestBody ChangePasswordDto dto, HttpServletRequest request) {
        if (dto == null || dto.getOldPassword() == null || dto.getNewPassword() == null) {
            return Result.fail(ResultCode.PARAM_ERROR, ResultCode.PARAM_ERROR_MSG);
        }
        User loginUser = (User) request.getAttribute("loginUser");
        userService.changePassword(loginUser.getId(), dto.getOldPassword(), dto.getNewPassword());

        // 密码变了，把当前 token 作废，强制重新登录
        TokenUtils.removeToken(request.getHeader("Authorization"));
        return Result.success();
    }

    /* ==================== 上传辅助 ==================== */

    /** 只接受白名单扩展名，其余一律当成 .png —— 防的是传个 .jsp/.svg 上来 */
    private static String extensionOf(String originalFilename) {
        if (originalFilename == null) return ".png";
        int i = originalFilename.lastIndexOf('.');
        if (i < 0 || i == originalFilename.length() - 1) return ".png";
        String ext = originalFilename.substring(i).toLowerCase();
        return ext.matches("\\.(jpg|jpeg|png|gif|webp|bmp)") ? ext : ".png";
    }

    /** 删掉上一张头像文件（只删自己上传的，别误删外链） */
    private void deleteOldAvatar(String oldUrl) {
        if (oldUrl == null || !oldUrl.startsWith("/uploads/")) return;
        File old = new File(uploadDir, oldUrl.substring("/uploads/".length())).getAbsoluteFile();
        if (old.isFile() && !old.delete()) {
            log.warn("旧头像删除失败: " + old.getAbsolutePath());
        }
    }
}
