use axum::{
    routing::{get, post, put, delete},
    Router,
};

use crate::handlers::ratings::{
    create_rating, delete_rating, get_skill_rating_stats, get_user_ratings, update_rating,
};
use crate::AppState;

pub fn rating_routes() -> Router<AppState> {
    Router::new()
        .route("/ratings", get(get_user_ratings))
        .route("/skills/:id/ratings", get(get_skill_rating_stats))
        .route("/skills/:id/rating", post(create_rating))
        .route("/ratings/:id", put(update_rating))
        .route("/ratings/:id", delete(delete_rating))
}
