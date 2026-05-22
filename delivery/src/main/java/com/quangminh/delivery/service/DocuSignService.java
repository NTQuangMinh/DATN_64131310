package com.quangminh.delivery.service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.bouncycastle.asn1.pkcs.PrivateKeyInfo;
import org.bouncycastle.openssl.PEMKeyPair;
import org.bouncycastle.openssl.PEMParser;
import org.bouncycastle.openssl.jcajce.JcaPEMKeyConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import com.quangminh.delivery.entity.Order;

import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.PrivateKey;
import java.util.*;

@Service
public class DocuSignService {

    @Value("${docusign.integration-key}") private String clientId;
    @Value("${docusign.user-id}") private String userId;
    @Value("${docusign.account-id}") private String accountId;

    private final String AUTH_URL = "https://account-d.docusign.com/oauth/token";
    private final String BASE_API = "https://demo.docusign.net/restapi/v2.1";

    private final RestTemplate restTemplate = new RestTemplate();

    public String getEmbeddedSigningUrl(Order order, String pdfPath) throws Exception {
        try {
            String accessToken = getAccessToken();
            byte[] pdfBytes = Files.readAllBytes(Paths.get(pdfPath));
            String pdfBase64 = Base64.getEncoder().encodeToString(pdfBytes);
            String envelopeId = createEnvelope(accessToken, order, pdfBase64);
            return getRecipientViewUrl(accessToken, envelopeId, order);
        } catch (Exception e) {
            System.err.println("LỖI DOCUSIGN SERVICE: " + e.getMessage());
            throw e;
        }
    }

    private String getAccessToken() throws Exception {
        // --- SỬ DỤNG BOUNCY CASTLE ĐỂ ĐỌC PKCS#1 (RSA PRIVATE KEY) ---
        PrivateKey privateKey;
        try (PEMParser pemParser = new PEMParser(new InputStreamReader(new ClassPathResource("private.key").getInputStream()))) {
            Object object = pemParser.readObject();
            JcaPEMKeyConverter converter = new JcaPEMKeyConverter();

            if (object instanceof PEMKeyPair) {
                // Nếu là định dạng PKCS#1 (RSA PRIVATE KEY)
                privateKey = converter.getPrivateKey(((PEMKeyPair) object).getPrivateKeyInfo());
            } else if (object instanceof PrivateKeyInfo) {
                // Nếu là định dạng PKCS#8 (PRIVATE KEY)
                privateKey = converter.getPrivateKey((PrivateKeyInfo) object);
            } else {
                throw new RuntimeException("Định dạng file private.key không hợp lệ!");
            }
        }

        // Tạo JWT Claims
        long now = System.currentTimeMillis() / 1000;
        String jwt = Jwts.builder()
                .setIssuer(clientId)
                .setSubject(userId)
                .setAudience("account-d.docusign.com")
                .setExpiration(new Date((now + 3600) * 1000))
                .setIssuedAt(new Date(now * 1000))
                .claim("scope", "signature impersonation")
                .signWith(privateKey, SignatureAlgorithm.RS256)
                .compact();

        // Gọi API lấy Token
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
        map.add("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
        map.add("assertion", jwt);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(map, headers);
        @SuppressWarnings("rawtypes")
        ResponseEntity<Map> response = restTemplate.postForEntity(AUTH_URL, request, Map.class);

        return (String) response.getBody().get("access_token");
    }

    private String createEnvelope(String token, Order order, String pdfBase64) {
        String url = BASE_API + "/accounts/" + accountId + "/envelopes";
        Map<String, Object> body = new HashMap<>();
        body.put("emailSubject", "Ký xác nhận đơn hàng " + order.getOrderCode());
        body.put("status", "sent");

        Map<String, String> doc = new HashMap<>();
        doc.put("documentBase64", pdfBase64);
        doc.put("name", "Bien-ban-giao-hang-" + order.getOrderCode() + ".pdf");
        doc.put("fileExtension", "pdf");
        doc.put("documentId", "1");
        body.put("documents", Collections.singletonList(doc));

        Map<String, Object> signer = new HashMap<>();

        // ========================================================
        // SỬA TẠI ĐÂY: Chuyển thông tin người ký thành Khách Hàng
        // Tạo một email ảo duy nhất dựa trên mã đơn hàng để DocuSign không bị nhầm lẫn
        // ========================================================
        signer.put("email", "khach_" + order.getOrderCode() + "@delivery.local");
        signer.put("name", order.getCustomerName()); // Lấy tên Khách hàng
        signer.put("recipientId", "1");

        // Cực kỳ quan trọng: Lấy ID đơn hàng làm định danh phiên ký
        signer.put("clientUserId", order.getId().toString());
        // ========================================================

        Map<String, Object> signHere = new HashMap<>();
        signHere.put("documentId", "1");
        signHere.put("pageNumber", "1");
        signHere.put("xPosition", "100");
        signHere.put("yPosition", "600");

        Map<String, Object> tabs = new HashMap<>();
        tabs.put("signHereTabs", Collections.singletonList(signHere));
        signer.put("tabs", tabs);

        Map<String, Object> recipients = new HashMap<>();
        recipients.put("signers", Collections.singletonList(signer));
        body.put("recipients", recipients);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        return (String) restTemplate.postForObject(url, new HttpEntity<>(body, headers), Map.class).get("envelopeId");
    }

    private String getRecipientViewUrl(String token, String envelopeId, Order order) {
        String url = BASE_API + "/accounts/" + accountId + "/envelopes/" + envelopeId + "/views/recipient";
        Map<String, String> body = new HashMap<>();
        body.put("authenticationMethod", "none");

        // ========================================================
        // SỬA TẠI ĐÂY: Thông tin này PHẢI KHỚP TUYỆT ĐỐI với thông tin ở createEnvelope
        // ========================================================
        body.put("email", "khach_" + order.getOrderCode() + "@delivery.local");
        body.put("userName", order.getCustomerName());
        body.put("clientUserId", order.getId().toString());
        // ========================================================

        body.put("returnUrl", "http://success.delivery.app/finish");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        return (String) restTemplate.postForObject(url, new HttpEntity<>(body, headers), Map.class).get("url");
    }
}