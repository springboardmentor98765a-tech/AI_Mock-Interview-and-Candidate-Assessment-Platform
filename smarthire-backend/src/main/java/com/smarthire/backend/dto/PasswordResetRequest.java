package com.smarthire.backend.dto;
public class PasswordResetRequest { private String email, token, newPassword; public String getEmail(){return email;} public void setEmail(String v){email=v;} public String getToken(){return token;} public void setToken(String v){token=v;} public String getNewPassword(){return newPassword;} public void setNewPassword(String v){newPassword=v;} }
