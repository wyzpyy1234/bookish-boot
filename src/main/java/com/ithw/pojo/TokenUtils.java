package com.ithw.pojo;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class TokenUtils {
    private static final Map<String,User> tokenMap = new ConcurrentHashMap<>();

    public static void setToken(String uuid,User user){
        tokenMap.put(uuid,user);
    }

    public static User getUser(String uuid){
        return tokenMap.get(uuid);
    }

    public static void removeToken(String uuid){
        tokenMap.remove(uuid);
    }
}
