package com.quangminh.delivery.service;

import org.springframework.stereotype.Service;
import java.security.*;
import java.util.Base64;

@Service
public class SignatureService {

    // Tạo mã băm SHA-256 cho dữ liệu biên bản
    public String calculateHash(String data) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(data.getBytes());
        return Base64.getEncoder().encodeToString(hash);
    }

    // Xác thực chữ ký bằng Public Key
    public boolean verifySignature(String data, String signature, PublicKey publicKey) throws Exception {
        Signature publicSignature = Signature.getInstance("SHA256withRSA");
        publicSignature.initVerify(publicKey);
        publicSignature.update(data.getBytes());
        byte[] signatureBytes = Base64.getDecoder().decode(signature);
        return publicSignature.verify(signatureBytes);
    }
}