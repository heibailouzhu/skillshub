use std::path::Path;

use anyhow::{anyhow, Result};
use reqwest::multipart::{Form, Part};
use reqwest::{Client, Response};
use tokio::fs;

use crate::api::types::{ErrorPayload, LoginRequest, LoginResponse, PublishedSkill, RegistryBundle, RegistrySkillMetadata};
use crate::auth::require_token;
use crate::config::normalize_repository;

pub struct SkillShubClient {
    base_url: String,
    http: Client,
}

impl SkillShubClient {
    pub fn new(repository: &str) -> Result<Self> {
        Ok(Self {
            base_url: normalize_repository(repository)?,
            http: Client::builder().build()?,
        })
    }

    async fn error_detail(response: Response) -> String {
        let status = response.status();
        match response.json::<ErrorPayload>().await {
            Ok(payload) => match (payload.error_code, payload.error) {
                (Some(code), Some(error)) => format!("{code}: {error}"),
                (Some(code), None) => code,
                (None, Some(error)) => error,
                _ => format!("{} {}", status.as_u16(), status.canonical_reason().unwrap_or("Request failed")),
            },
            Err(_) => format!("{} {}", status.as_u16(), status.canonical_reason().unwrap_or("Request failed")),
        }
    }

    async fn get_json<T: serde::de::DeserializeOwned>(&self, path: &str) -> Result<T> {
        let url = format!("{}{}", self.base_url, path);
        let response = self.http.get(&url).send().await?;
        if !response.status().is_success() {
            return Err(anyhow!("Request failed for {url}: {}", Self::error_detail(response).await));
        }
        Ok(response.json::<T>().await?)
    }

    pub async fn login(&self, username: &str, password: &str) -> Result<LoginResponse> {
        let url = format!("{}/api/auth/login", self.base_url);
        let response = self
            .http
            .post(&url)
            .json(&LoginRequest {
                username: username.to_string(),
                password: password.to_string(),
            })
            .send()
            .await?;
        if !response.status().is_success() {
            return Err(anyhow!("Login failed: {}", Self::error_detail(response).await));
        }
        Ok(response.json().await?)
    }

    pub async fn get_skill(&self, slug: &str) -> Result<RegistrySkillMetadata> {
        self.get_json(&format!("/api/registry/skills/{}", urlencoding::encode(slug))).await
    }

    pub async fn get_bundle(&self, slug: &str, version: &str) -> Result<RegistryBundle> {
        self.get_json(&format!(
            "/api/registry/skills/{}/versions/{}/bundle",
            urlencoding::encode(slug),
            urlencoding::encode(version)
        ))
        .await
    }

    pub async fn download_archive(&self, skill_id: &str) -> Result<Vec<u8>> {
        let url = format!("{}/api/skills/{}/archive", self.base_url, urlencoding::encode(skill_id));
        let response = self.http.get(&url).send().await?;
        if !response.status().is_success() {
            return Err(anyhow!("Archive download failed: {}", Self::error_detail(response).await));
        }
        Ok(response.bytes().await?.to_vec())
    }

    pub async fn publish_skill(
        &self,
        archive_path: &Path,
        slug: Option<&str>,
        title: &str,
        description: Option<&str>,
        category: Option<&str>,
        version: Option<&str>,
        tags: &[String],
    ) -> Result<PublishedSkill> {
        let token = require_token().await?;
        let url = format!("{}/api/skills/upload", self.base_url);
        let archive_bytes = fs::read(archive_path).await?;
        let file_name = archive_path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("skill.zip")
            .to_string();

        let mut form = Form::new().text("title", title.to_string());
        if let Some(slug) = slug {
            form = form.text("slug", slug.to_string());
        }
        if let Some(description) = description {
            form = form.text("description", description.to_string());
        }
        if let Some(category) = category {
            form = form.text("category", category.to_string());
        }
        if let Some(version) = version {
            form = form.text("version", version.to_string());
        }
        if !tags.is_empty() {
            form = form.text("tags", tags.join(","));
        }
        form = form.part(
            "archive",
            Part::bytes(archive_bytes)
                .file_name(file_name)
                .mime_str("application/zip")?,
        );

        let response = self
            .http
            .post(&url)
            .bearer_auth(token)
            .multipart(form)
            .send()
            .await?;
        if !response.status().is_success() {
            return Err(anyhow!("Publish failed: {}", Self::error_detail(response).await));
        }
        Ok(response.json().await?)
    }
}
