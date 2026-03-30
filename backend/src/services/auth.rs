use anyhow::Result;
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

/// JWT Claims 结构体
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String, // user_id
    pub exp: usize,  // 过期时间
    pub iat: usize,  // 签发时间
}

/// 认证服务
#[derive(Clone)]
pub struct AuthService {
    pub jwt_secret: String,
    pub jwt_expiration_hours: i64,
}

impl AuthService {
    /// 创建新的认证服务
    pub fn new(jwt_secret: String, jwt_expiration_hours: i64) -> Self {
        Self {
            jwt_secret,
            jwt_expiration_hours,
        }
    }

    /// 对密码进行哈希处理
    pub fn hash_password(&self, password: &str) -> Result<String> {
        let hashed = hash(password, DEFAULT_COST)?;
        Ok(hashed)
    }

    /// 验证密码
    pub fn verify_password(&self, password: &str, hashed: &str) -> Result<bool> {
        let is_valid = verify(password, hashed)?;
        Ok(is_valid)
    }

    /// 生成 JWT Token
    pub fn generate_token(&self, user_id: &str) -> Result<String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)?
            .as_secs() as usize;

        let exp = now + (self.jwt_expiration_hours * 3600) as usize;

        let claims = Claims {
            sub: user_id.to_string(),
            exp,
            iat: now,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.jwt_secret.as_ref()),
        )?;

        Ok(token)
    }

    /// 验证 JWT Token
    pub fn verify_token(&self, token: &str) -> Result<Claims> {
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.jwt_secret.as_ref()),
            &Validation::default(),
        )?;

        Ok(token_data.claims)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_hashing() {
        let service = AuthService::new("test_secret".to_string(), 24);
        let password = "test_password_123";

        let hashed = service.hash_password(password).unwrap();
        assert_ne!(password, hashed, "Hashed password should differ from plain text");

        let is_valid = service.verify_password(password, &hashed).unwrap();
        assert!(is_valid, "Password verification should succeed");
    }

    #[test]
    fn test_jwt_generation() {
        let service = AuthService::new("test_secret".to_string(), 24);
        let user_id = "user_123";

        let token = service.generate_token(user_id).unwrap();
        assert!(!token.is_empty(), "Token should not be empty");

        let claims = service.verify_token(&token).unwrap();
        assert_eq!(claims.sub, user_id, "Subject should match user_id");
        assert!(claims.exp > claims.iat, "Expiration should be after issuance");
    }

    #[test]
    fn test_jwt_verification() {
        let service = AuthService::new("test_secret".to_string(), 24);
        let user_id = "user_123";

        let token = service.generate_token(user_id).unwrap();
        let claims = service.verify_token(&token).unwrap();

        assert_eq!(claims.sub, user_id);
    }

    #[test]
    fn test_wrong_password_fails() {
        let service = AuthService::new("test_secret".to_string(), 24);
        let password = "correct_password";
        let wrong_password = "wrong_password";

        let hashed = service.hash_password(password).unwrap();
        let is_valid = service.verify_password(wrong_password, &hashed).unwrap();

        assert!(!is_valid, "Wrong password should fail verification");
    }
}
